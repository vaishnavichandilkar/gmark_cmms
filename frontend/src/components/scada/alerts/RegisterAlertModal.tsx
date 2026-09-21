import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  AlertTriangle,
  AlertOctagon,
  Info,
  Trash2,
  Check,
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
}

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
    } else {
      setEnabled(true);
      setAlertType('WARNING');
      setIntensity(1);
      setConditionType('GREATER_THAN');
      setConditionValue('');
      setMessage(
        registerName
          ? `${registerName} threshold alert triggered`
          : `Register ${registerNumber} alert triggered`,
      );
    }
  }, [existingConfig, registerNumber, registerName, isOpen]);

  if (!isOpen) return null;

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
            className="w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors"
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
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
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
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-bold ${
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
                  className={`py-2 rounded-lg font-mono font-bold text-sm border transition-all ${
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
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
