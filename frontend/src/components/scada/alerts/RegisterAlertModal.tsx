import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Bell,
  AlertTriangle,
  AlertOctagon,
  Info,
  Trash2,
  Check,
  Mail,
  Loader2,
  Users,
  Clock,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

export type ConditionType =
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'EQUAL_TO'
  | 'NOT_EQUAL_TO'
  | 'GTE'
  | 'LTE';

export interface RegisterAlertConfigData {
  id?: number;
  deviceId: string;
  registerNumber: number;
  registerName?: string;
  enabled: boolean;
  alertType: 'EMERGENCY' | 'WARNING' | 'NOTIFY';
  intensity: number;
  conditionType: ConditionType;
  conditionValue: number;
  message: string;
  sendEmail?: boolean;
  emailRecipients?: string;
  notifyRoles?: string;
  enableEscalation?: boolean;
  escalationIntervalMinutes?: number;
  escalationChain?: string;
}

const SYSTEM_ROLES = [
  { key: 'SUPER_ADMIN', label: 'Super Admin', desc: 'System Admins' },
  { key: 'BUILDING_ADMIN', label: 'Building Admin', desc: 'Building Managers' },
  { key: 'OPERATOR', label: 'Operator', desc: 'On-Duty Operators' },
  { key: 'SOCIETY_ADMIN', label: 'Society Admin', desc: 'Society Leads' },
  { key: 'VIEWER', label: 'Viewer', desc: 'Auditors / Viewers' },
];

interface ConditionOption {
  value: ConditionType;
  symbol: string;
  label: string;
  mathHint: string;
}

const CONDITION_OPTIONS: ConditionOption[] = [
  { value: 'GREATER_THAN', symbol: '>', label: 'Greater Than', mathHint: 'Value > Threshold' },
  { value: 'LESS_THAN', symbol: '<', label: 'Less Than', mathHint: 'Value < Threshold' },
  { value: 'EQUAL_TO', symbol: '==', label: 'Equal To', mathHint: 'Value == Threshold' },
  { value: 'NOT_EQUAL_TO', symbol: '!=', label: 'Not Equal To', mathHint: 'Value != Threshold' },
  { value: 'GTE', symbol: '≥', label: 'Greater or Equal', mathHint: 'Value ≥ Threshold' },
  { value: 'LTE', symbol: '≤', label: 'Less or Equal', mathHint: 'Value ≤ Threshold' },
];

interface RegisterAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  registerNumber: number;
  registerName?: string;
  currentValue?: number | string;
  existingConfig?: RegisterAlertConfigData | null;
  onSaved: (config: RegisterAlertConfigData | null) => void;
}

export const RegisterAlertModal: React.FC<RegisterAlertModalProps> = ({
  isOpen,
  onClose,
  deviceId,
  registerNumber,
  registerName,
  currentValue,
  existingConfig,
  onSaved,
}) => {
  const [enabled, setEnabled] = useState(true);
  const [alertType, setAlertType] = useState<'EMERGENCY' | 'WARNING' | 'NOTIFY'>('WARNING');
  const [intensity, setIntensity] = useState<number>(1);
  const [conditionType, setConditionType] = useState<ConditionType>('GREATER_THAN');
  const [conditionValue, setConditionValue] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [sendEmail, setSendEmail] = useState<boolean>(true);
  const [emailRecipients, setEmailRecipients] = useState<string>('');
  const [notifyRoles, setNotifyRoles] = useState<string[]>([
    'SUPER_ADMIN',
    'BUILDING_ADMIN',
    'OPERATOR',
  ]);
  const [enableEscalation, setEnableEscalation] = useState(false);
  const [escalationIntervalMinutes, setEscalationIntervalMinutes] = useState(60);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Custom Dropdown State
  const [isConditionDropdownOpen, setIsConditionDropdownOpen] = useState(false);
  const conditionDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (existingConfig) {
      setEnabled(existingConfig.enabled);
      setAlertType(existingConfig.alertType);
      setIntensity(existingConfig.intensity || 1);
      setConditionType(existingConfig.conditionType);
      setConditionValue(existingConfig.conditionValue.toString());
      setMessage(existingConfig.message || '');
      setSendEmail(existingConfig.sendEmail !== undefined ? existingConfig.sendEmail : true);
      setEmailRecipients(existingConfig.emailRecipients || '');
      setEnableEscalation(Boolean(existingConfig.enableEscalation));
      setEscalationIntervalMinutes(existingConfig.escalationIntervalMinutes || 60);
      if (existingConfig.notifyRoles) {
        setNotifyRoles(
          existingConfig.notifyRoles.split(',').map((r) => r.trim()).filter(Boolean),
        );
      } else {
        setNotifyRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'OPERATOR']);
      }
    } else {
      setEnabled(true);
      setAlertType('WARNING');
      setIntensity(1);
      setConditionType('GREATER_THAN');
      setConditionValue('');
      setSendEmail(true);
      setEmailRecipients('');
      setNotifyRoles(['SUPER_ADMIN', 'BUILDING_ADMIN', 'OPERATOR']);
      setEnableEscalation(false);
      setEscalationIntervalMinutes(60);
      setMessage(
        registerName
          ? `${registerName} threshold alert triggered`
          : `Register ${registerNumber} alert triggered`,
      );
    }
  }, [existingConfig, registerNumber, registerName, isOpen]);

  // Click outside listener for condition dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        conditionDropdownRef.current &&
        !conditionDropdownRef.current.contains(event.target as Node)
      ) {
        setIsConditionDropdownOpen(false);
      }
    };
    if (isConditionDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isConditionDropdownOpen]);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isConditionDropdownOpen) {
          setIsConditionDropdownOpen(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isConditionDropdownOpen, onClose]);


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (conditionValue === '' || isNaN(Number(conditionValue))) {
      toast.error('Please enter a valid numeric condition value');
      return;
    }

    if (!message.trim()) {
      toast.error('Please enter an alert message');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        registerNumber: Number(registerNumber),
        registerName: registerName || `Register ${registerNumber}`,
        enabled,
        alertType,
        intensity: Number(intensity),
        conditionType,
        conditionValue: parseFloat(conditionValue),
        message: message.trim(),
        sendEmail,
        emailRecipients: emailRecipients.trim() || undefined,
        notifyRoles: notifyRoles.join(','),
        enableEscalation,
        escalationIntervalMinutes: Number(escalationIntervalMinutes),
        escalationChain: 'OPERATOR,BUILDING_ADMIN,SUPER_ADMIN',
      };

      const res = await api.post(`/alerts/config/${deviceId}`, payload);
      toast.success('Alert configuration saved successfully!');
      onSaved(res.data);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save alert configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to remove the alert rule for this register?')) {
      return;
    }

    setDeleting(true);
    try {
      await api.delete(`/alerts/config/${deviceId}/${registerNumber}`);
      toast.success('Alert configuration deleted');
      onSaved(null);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete alert configuration');
    } finally {
      setDeleting(false);
    }
  };

  const alertTypeConfig = {
    EMERGENCY: {
      color: 'border-gray-200 bg-white text-gray-700 hover:border-red-300 hover:bg-red-50/40',
      activeColor: 'border-red-500 bg-red-500 text-white shadow-sm ring-2 ring-red-500/20',
      tag: 'Critical Action',
      icon: <AlertOctagon size={16} />,
    },
    WARNING: {
      color: 'border-gray-200 bg-white text-gray-700 hover:border-amber-300 hover:bg-amber-50/40',
      activeColor: 'border-amber-500 bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/20',
      tag: 'Caution',
      icon: <AlertTriangle size={16} />,
    },
    NOTIFY: {
      color: 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/40',
      activeColor: 'border-blue-600 bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20',
      tag: 'Advisory',
      icon: <Info size={16} />,
    },
  };

  const selectedCondition =
    CONDITION_OPTIONS.find((opt) => opt.value === conditionType) || CONDITION_OPTIONS[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 z-10 flex flex-col max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 shadow-xs shrink-0">
                  <Bell size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-base">Configure Alert</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-md font-mono font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                      Reg #{registerNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500 font-medium">
                      {registerName || `Register ${registerNumber}`}
                    </span>
                    {currentValue !== undefined && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 font-mono text-[11px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live: {currentValue}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form wrapping scrollable content + pinned footer */}
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                {/* 1. Alert Enabled Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50/80 rounded-2xl border border-gray-200/70 shadow-xs">
                  <div>
                    <label className="text-sm font-bold text-gray-900 block leading-tight">
                      Alert Enabled
                    </label>
                    <span className="text-xs text-gray-500 mt-0.5 block">
                      Activate real-time rule evaluation for this register
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnabled(!enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                      enabled ? 'bg-emerald-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* 2. Alert Type (Severity) */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-2">
                    Alert Type (Severity)
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(['EMERGENCY', 'WARNING', 'NOTIFY'] as const).map((type) => {
                      const conf = alertTypeConfig[type];
                      const isSelected = alertType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setAlertType(type)}
                          className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer ${
                            isSelected ? conf.activeColor : conf.color
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {conf.icon}
                            <span>{type}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Intensity Level (1 to 5) */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Intensity Level (1 - 5)
                    </label>
                    <span className="text-xs font-mono font-semibold text-gray-500">
                      Level {intensity} of 5
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setIntensity(lvl)}
                        className={`py-2 rounded-xl font-mono font-bold text-sm border transition-all cursor-pointer ${
                          intensity === lvl
                            ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                            : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Condition Type & Value */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Custom Condition Type Dropdown */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">
                      Condition Type
                    </label>
                    <div className="relative" ref={conditionDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsConditionDropdownOpen(!isConditionDropdownOpen)}
                        className={`w-full bg-white border rounded-xl px-3.5 py-2.5 flex items-center justify-between text-left transition-all duration-150 cursor-pointer ${
                          isConditionDropdownOpen
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-700 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                            {selectedCondition.symbol}
                          </span>
                          <span className="text-sm font-semibold text-gray-800 truncate">
                            {selectedCondition.label} ({selectedCondition.symbol})
                          </span>
                        </div>
                        <ChevronDown
                          size={16}
                          className={`text-gray-400 transition-transform duration-200 shrink-0 ml-1 ${
                            isConditionDropdownOpen ? 'rotate-180 text-emerald-600' : ''
                          }`}
                        />
                      </button>

                      {/* Dropdown Menu */}
                      {isConditionDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-gray-100 shadow-2xl shadow-gray-900/15 p-1.5 z-50 space-y-0.5">
                          {CONDITION_OPTIONS.map((opt) => {
                            const isSelected = opt.value === conditionType;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setConditionType(opt.value);
                                  setIsConditionDropdownOpen(false);
                                }}
                                className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-50 text-emerald-900 font-semibold'
                                    : 'hover:bg-gray-50 text-gray-700'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span
                                    className={`w-6 h-6 rounded-md font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {opt.symbol}
                                  </span>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-semibold truncate leading-tight">
                                      {opt.label}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-mono leading-tight mt-0.5">
                                      {opt.mathHint}
                                    </span>
                                  </div>
                                </div>
                                {isSelected && (
                                  <Check size={14} className="text-emerald-600 shrink-0 ml-2" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Condition Value */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">
                      Condition Value (Threshold)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 50.5"
                      value={conditionValue}
                      onChange={(e) => setConditionValue(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* 5. Custom Alert Message */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">
                    Alert Message
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g., Pump 1 Overload Trip / Temperature exceeded safety limit"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                  />
                </div>

                {/* 6. Email Notification Settings */}
                <div className="bg-gray-50/70 rounded-2xl border border-gray-200/80 p-4 space-y-3.5 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Mail size={17} />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-gray-900 block leading-tight">
                          Email Notifications
                        </label>
                        <span className="text-xs text-gray-500">
                          Dispatch email alerts when this rule triggers
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSendEmail(!sendEmail)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                        sendEmail ? 'bg-emerald-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                          sendEmail ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {sendEmail && (
                    <div className="pt-3 border-t border-gray-200/70 space-y-3.5">
                      {/* Target Roles */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Users size={13} className="text-emerald-600" />
                            Notify User Roles
                          </label>
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                            {notifyRoles.length} role{notifyRoles.length !== 1 ? 's' : ''} selected
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {SYSTEM_ROLES.map((role) => {
                            const isSelected = notifyRoles.includes(role.key);
                            return (
                              <button
                                key={role.key}
                                type="button"
                                onClick={() => {
                                  setNotifyRoles((prev) =>
                                    isSelected
                                      ? prev.filter((r) => r !== role.key)
                                      : [...prev, role.key],
                                  );
                                }}
                                className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex flex-col min-w-0 pr-1">
                                  <span className="text-xs font-bold truncate leading-tight">
                                    {role.label}
                                  </span>
                                  <span
                                    className={`text-[10px] truncate leading-tight mt-0.5 ${
                                      isSelected ? 'text-emerald-100' : 'text-gray-400'
                                    }`}
                                  >
                                    {role.desc}
                                  </span>
                                </div>
                                {isSelected && <Check size={14} className="shrink-0 text-white" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom Email Recipients */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Additional Custom Recipient(s) (Optional)
                          </label>
                          <span className="text-[11px] text-gray-400 font-normal">
                            Comma-separated
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. technician@vendor.com, emergency@service.com"
                          value={emailRecipients}
                          onChange={(e) => setEmailRecipients(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                        />
                      </div>

                      <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-2">
                        <Check size={13} className="text-emerald-600 shrink-0" />
                        Live alert emails will be automatically dispatched to all active members matching the selected roles whenever this rule triggers.
                      </p>
                    </div>
                  )}
                </div>

                {/* 7. Tiered Escalation Matrix */}
                <div className="bg-gray-50/70 rounded-2xl border border-gray-200/80 p-4 space-y-3.5 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center justify-center shrink-0">
                        <Clock size={17} />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-gray-900 block leading-tight">
                          Tiered Escalation Matrix
                        </label>
                        <span className="text-xs text-gray-500">
                          Escalate unacknowledged alerts to upper management
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEnableEscalation(!enableEscalation)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                        enableEscalation ? 'bg-purple-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                          enableEscalation ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {enableEscalation && (
                    <div className="pt-3 border-t border-gray-200/70 space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Escalation Delay Interval
                          </label>
                          <span className="text-[11px] font-semibold text-purple-700 bg-purple-100/70 border border-purple-200/60 px-2 py-0.5 rounded-full">
                            Every{' '}
                            {escalationIntervalMinutes >= 60
                              ? `${escalationIntervalMinutes / 60} hr(s)`
                              : `${escalationIntervalMinutes} mins`}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[
                            { label: '15m', val: 15 },
                            { label: '30m', val: 30 },
                            { label: '1 Hr', val: 60 },
                            { label: '2 Hrs', val: 120 },
                            { label: '4 Hrs', val: 240 },
                          ].map((opt) => (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => setEscalationIntervalMinutes(opt.val)}
                              className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                escalationIntervalMinutes === opt.val
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Visual Escalation Flow Chart */}
                      <div className="p-3 bg-white rounded-xl border border-gray-200/80 space-y-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                          Escalation Hierarchy Flow
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-semibold overflow-x-auto py-1">
                          <div className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 flex flex-col shrink-0">
                            <span className="text-[9px] uppercase font-bold text-blue-500">Tier 1</span>
                            <span>Operator</span>
                          </div>
                          <ArrowRight size={14} className="text-gray-400 shrink-0" />
                          <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex flex-col shrink-0">
                            <span className="text-[9px] uppercase font-bold text-amber-600">
                              Tier 2 (+{escalationIntervalMinutes >= 60 ? `${escalationIntervalMinutes / 60}h` : `${escalationIntervalMinutes}m`})
                            </span>
                            <span>Building Admin</span>
                          </div>
                          <ArrowRight size={14} className="text-gray-400 shrink-0" />
                          <div className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-800 border border-red-200 flex flex-col shrink-0">
                            <span className="text-[9px] uppercase font-bold text-red-600">
                              Tier 3 (+{escalationIntervalMinutes >= 60 ? `${(escalationIntervalMinutes * 2) / 60}h` : `${escalationIntervalMinutes * 2}m`})
                            </span>
                            <span>Super Admin</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-400 italic">
                          If the operator does not acknowledge the alarm within the delay interval, an escalated incident notice is automatically dispatched.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Fixed Bottom Action Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between gap-3 shrink-0 rounded-b-3xl">
                {existingConfig ? (
                  <button
                    type="button"
                    disabled={deleting || saving}
                    onClick={handleDelete}
                    className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 size={14} />
                    {deleting ? 'Deleting...' : 'Delete Alert'}
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={saving || deleting}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || deleting}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-xs hover:shadow flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check size={15} />
                        Save Configuration
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
