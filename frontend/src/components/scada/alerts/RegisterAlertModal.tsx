import { useState, useEffect } from 'react';
import {
  X,
  Bell,
  AlertTriangle,
  AlertOctagon,
  Info,
  Trash2,
  Check,
  Mail,
  Send,
  Loader2,
  Users,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

export interface RegisterAlertConfigData {
  id?: number;
  deviceId: string;
  registerNumber: number;
  registerName?: string;
  enabled: boolean;
  alertType: 'EMERGENCY' | 'WARNING' | 'NOTIFY';
  intensity: number;
  conditionType: 'GREATER_THAN' | 'LESS_THAN' | 'EQUAL_TO' | 'NOT_EQUAL_TO' | 'GTE' | 'LTE';
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
  const [conditionType, setConditionType] = useState<
    'GREATER_THAN' | 'LESS_THAN' | 'EQUAL_TO' | 'NOT_EQUAL_TO' | 'GTE' | 'LTE'
  >('GREATER_THAN');
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
  const [testingEmail, setTestingEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  if (!isOpen) return null;

  const handleSendTestEmail = async () => {
    const target = emailRecipients.trim() || undefined;
    setTestingEmail(true);
    try {
      const res = await api.post('/alerts/test-email', {
        email: target,
        deviceId,
        roles: notifyRoles,
      });
      if (res.data?.success) {
        const rolesText = res.data.rolesFound?.length > 0 ? ` [Roles: ${res.data.rolesFound.join(', ')}]` : '';
        toast.success(
          `Test alert email dispatched to: ${res.data.sentTo?.join(', ') || target || 'default recipients'}${rolesText}`,
          { duration: 4500 },
        );
      } else {
        toast.error(res.data?.error || 'Failed to dispatch test email');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to send test email');
    } finally {
      setTestingEmail(false);
    }
  };

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
      toast.error(
        err.response?.data?.message || 'Failed to save alert configuration',
      );
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
      toast.error(
        err.response?.data?.message || 'Failed to delete alert configuration',
      );
    } finally {
      setDeleting(false);
    }
  };

  const alertTypeConfig = {
    EMERGENCY: {
      color: 'border-red-500 bg-red-50 text-red-700',
      activeColor: 'ring-2 ring-red-500 bg-red-500 text-white',
      badge: 'bg-red-100 text-red-700 border-red-200',
      icon: <AlertOctagon size={16} />,
      desc: 'Critical state requiring immediate action',
    },
    WARNING: {
      color: 'border-amber-500 bg-amber-50 text-amber-700',
      activeColor: 'ring-2 ring-amber-500 bg-amber-500 text-white',
      badge: 'bg-amber-100 text-amber-700 border-amber-200',
      icon: <AlertTriangle size={16} />,
      desc: 'Cautionary threshold breach',
    },
    NOTIFY: {
      color: 'border-blue-500 bg-blue-50 text-blue-700',
      activeColor: 'ring-2 ring-blue-500 bg-blue-500 text-white',
      badge: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: <Info size={16} />,
      desc: 'Informational status notice',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-200">
              <Bell size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                Configure Alert
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-gray-100 text-gray-700 border border-gray-200">
                  Reg #{registerNumber}
                </span>
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                {registerName || `Register ${registerNumber}`}
                {currentValue !== undefined && (
                  <span className="ml-2 font-mono text-emerald-600 font-semibold">
                    (Live: {currentValue})
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
          {/* 1. Alert Enabled Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/70">
            <div>
              <label className="text-sm font-bold text-gray-900 block">Alert Enabled</label>
              <span className="text-xs text-gray-500">
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
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 2. Alert Type (Severity) */}
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
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
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold cursor-pointer ${
                      isSelected
                        ? conf.activeColor + ' shadow-md scale-[1.02]'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
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
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Intensity Level (1 - 5)
              </label>
              <span className="text-xs font-mono font-bold text-gray-500">
                Level {intensity} of 5
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setIntensity(lvl)}
                  className={`py-2 rounded-lg font-mono font-bold text-sm border transition-all cursor-pointer ${
                    intensity === lvl
                      ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Condition Type & Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                Condition Type
              </label>
              <select
                value={conditionType}
                onChange={(e) => setConditionType(e.target.value as any)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="GREATER_THAN">GREATER THAN (&gt;)</option>
                <option value="LESS_THAN">LESS THAN (&lt;)</option>
                <option value="EQUAL_TO">EQUAL TO (==)</option>
                <option value="NOT_EQUAL_TO">NOT EQUAL TO (!=)</option>
                <option value="GTE">GREATER OR EQUAL (&ge;)</option>
                <option value="LTE">LESS OR EQUAL (&le;)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                Condition Value
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 50.5"
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* 5. Custom Alert Message */}
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
              Alert Message
            </label>
            <textarea
              rows={2}
              required
              placeholder="e.g., Pump 1 Overload Trip / Temperature exceeded safety limit"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* 6. Email Notification Settings */}
          <div className="p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/40 rounded-xl border border-blue-100/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center">
                  <Mail size={16} />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-900 block">Email Notification</label>
                  <span className="text-xs text-gray-500">
                    Dispatch email alerts when this rule triggers
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSendEmail(!sendEmail)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                  sendEmail ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    sendEmail ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {sendEmail && (
              <div className="pt-2.5 border-t border-blue-100/60 space-y-3.5">
                {/* Target Roles */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Users size={13} className="text-blue-600" />
                      Notify User Roles
                    </label>
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded-full">
                      {notifyRoles.length} role{notifyRoles.length !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
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
                          className={`p-2 rounded-xl text-left border transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex flex-col min-w-0 pr-1">
                            <span className="text-xs font-bold truncate leading-tight">
                              {role.label}
                            </span>
                            <span
                              className={`text-[9px] truncate leading-tight ${
                                isSelected ? 'text-blue-100' : 'text-gray-400'
                              }`}
                            >
                              {role.desc}
                            </span>
                          </div>
                          {isSelected && <Check size={13} className="shrink-0 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Emails will be delivered to active users matching the selected roles for this facility.
                  </p>
                </div>

                {/* Custom Email Recipients */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
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
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={testingEmail}
                    onClick={handleSendTestEmail}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1.5 border border-blue-200 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {testingEmail ? (
                      <Loader2 size={13} className="animate-spin text-blue-600" />
                    ) : (
                      <Send size={13} />
                    )}
                    {testingEmail ? 'Sending Test...' : 'Send Test Alert Email'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 7. Tiered Escalation Matrix */}
          <div className="p-4 bg-gradient-to-r from-purple-50/50 to-pink-50/40 rounded-xl border border-purple-100/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-600/10 text-purple-600 flex items-center justify-center">
                  <Clock size={16} />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-900 block">Tiered Escalation Matrix</label>
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
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enableEscalation ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {enableEscalation && (
              <div className="pt-2.5 border-t border-purple-100/60 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Escalation Delay Interval
                    </label>
                    <span className="text-[11px] font-semibold text-purple-700">
                      Escalates every {escalationIntervalMinutes >= 60 ? `${escalationIntervalMinutes / 60} hour(s)` : `${escalationIntervalMinutes} mins`}
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
                        className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          escalationIntervalMinutes === opt.val
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual Escalation Flow Chart */}
                <div className="p-3 bg-white rounded-xl border border-purple-100 space-y-2">
                  <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block">
                    Escalation Hierarchy Flow
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold overflow-x-auto py-1">
                    <div className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 flex flex-col shrink-0">
                      <span className="text-[10px] uppercase font-bold text-blue-500">Tier 1</span>
                      <span>Operator</span>
                    </div>
                    <ArrowRight size={14} className="text-gray-400 shrink-0" />
                    <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex flex-col shrink-0">
                      <span className="text-[10px] uppercase font-bold text-amber-500">Tier 2 (+{escalationIntervalMinutes >= 60 ? `${escalationIntervalMinutes / 60}h` : `${escalationIntervalMinutes}m`})</span>
                      <span>Building Admin</span>
                    </div>
                    <ArrowRight size={14} className="text-gray-400 shrink-0" />
                    <div className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-800 border border-red-200 flex flex-col shrink-0">
                      <span className="text-[10px] uppercase font-bold text-red-500">Tier 3 (+{escalationIntervalMinutes >= 60 ? `${(escalationIntervalMinutes * 2) / 60}h` : `${escalationIntervalMinutes * 2}m`})</span>
                      <span>Super Admin</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 italic">
                    If the Operator does not acknowledge the alarm within the delay interval, an escalated incident notice is automatically dispatched to the upper authority.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-3">
            {existingConfig ? (
              <button
                type="button"
                disabled={deleting || saving}
                onClick={handleDelete}
                className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Trash2 size={15} />
                {deleting ? 'Deleting...' : 'Delete Alert'}
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving || deleting}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || deleting}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-lg flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Check size={16} />
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
