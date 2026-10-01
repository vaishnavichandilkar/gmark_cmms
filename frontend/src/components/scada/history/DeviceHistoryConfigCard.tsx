import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  Clock,
  Loader2,
  Calendar,
  Layers,
  History,
  Activity,
  ChevronDown,
  Check,
} from 'lucide-react';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';
import { HistoricalDataModal } from './HistoricalDataModal';

interface DeviceHistoryConfigCardProps {
  deviceId: string;
  deviceName?: string;
  className?: string;
}

interface CustomDropdownProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  label,
  value,
  options,
  onChange,
  icon,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentOption = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">
        {label}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white border rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
          isOpen
            ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
            : 'border-gray-200 hover:border-gray-300 shadow-xs'
        } ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200' : 'text-gray-900'}`}
      >
        <div className="flex items-center gap-2.5 truncate">
          {icon && <span className="text-emerald-600 shrink-0">{icon}</span>}
          <span className="truncate">{currentOption?.label || value}</span>
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-emerald-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-left flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={16} className="text-emerald-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const DeviceHistoryConfigCard: React.FC<DeviceHistoryConfigCardProps> = ({
  deviceId,
  deviceName,
  className = '',
}) => {
  const [enabled, setEnabled] = useState(false);
  const [historyMode, setHistoryMode] = useState<'Time-based' | 'Conditional'>('Time-based');
  const [historyInterval, setHistoryInterval] = useState<'minute' | 'hour' | 'day'>('minute');
  const [lastHistoryAt, setLastHistoryAt] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load config on mount
  useEffect(() => {
    if (!deviceId) return;
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/devices/${deviceId}/history-config`);
        if (res.data) {
          setEnabled(res.data.historyEnabled ?? false);
          setHistoryMode(res.data.historyMode || 'Time-based');
          setHistoryInterval(res.data.historyInterval || 'minute');
          setLastHistoryAt(res.data.lastHistoryAt || null);
        }
      } catch (err) {
        console.error('Failed to load device history configuration', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [deviceId]);

  // Handle immediate toggle on/off
  const handleToggle = async () => {
    if (toggling || loading) return;
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    setToggling(true);

    try {
      const res = await api.put(`/devices/${deviceId}/history-config`, {
        historyEnabled: nextEnabled,
        historyMode,
        historyInterval,
      });

      if (res.data) {
        setEnabled(res.data.historyEnabled ?? nextEnabled);
        setHistoryMode(res.data.historyMode || historyMode);
        setHistoryInterval(res.data.historyInterval || historyInterval);
        setLastHistoryAt(res.data.lastHistoryAt || null);
      }
      if (nextEnabled) {
        toast.success('History logging enabled');
      } else {
        toast.success('History logging paused');
      }
    } catch (err: any) {
      // Revert state on error
      setEnabled(!nextEnabled);
      console.error('Failed to toggle history status:', err);
      toast.error(err.response?.data?.message || 'Failed to update history status');
    } finally {
      setToggling(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/devices/${deviceId}/history-config`, {
        historyEnabled: enabled,
        historyMode,
        historyInterval,
      });

      if (res.data) {
        setEnabled(res.data.historyEnabled ?? false);
        setHistoryMode(res.data.historyMode || 'Time-based');
        setHistoryInterval(res.data.historyInterval || 'minute');
        setLastHistoryAt(res.data.lastHistoryAt || null);
      }
      toast.success('History configuration saved successfully!');
    } catch (err: any) {
      console.error('Failed to save history config:', err);
      toast.error(err.response?.data?.message || 'Failed to save history configuration');
    } finally {
      setSaving(false);
    }
  };

  const historyModeOptions = [
    { label: 'Time-based', value: 'Time-based' },
    { label: 'Conditional', value: 'Conditional' },
  ];

  const intervalOptions = [
    { label: 'Every minute', value: 'minute' },
    { label: 'Every hour', value: 'hour' },
    { label: 'Every day', value: 'day' },
  ];

  return (
    <>
      <div
        className={`bg-white rounded-2xl border border-gray-200 shadow-sm transition-all duration-300 ${
          enabled ? 'p-5 sm:p-6' : 'p-4'
        } ${className}`}
      >
        {/* Header Row */}
        <div
          className={`flex items-center justify-between gap-4 transition-all duration-300 ${
            enabled ? 'mb-5' : 'mb-0'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors duration-300 ${
                enabled
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-gray-50 text-gray-400 border-gray-200'
              }`}
            >
              <History size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold tracking-wide text-sm uppercase text-gray-900">
                  Historical Data
                </h3>
                {enabled ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Active
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 border border-gray-200">
                    Disabled
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-gray-500 mt-0.5">
                {deviceName ? `${deviceName} (${deviceId})` : `Device ID: ${deviceId}`}
              </p>
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-3">
            {!enabled && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 transition-all cursor-pointer shadow-xs"
                title="View recorded historical snapshots"
              >
                <Layers size={13} />
                <span>View Logs</span>
              </button>
            )}

            {/* Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={toggling || loading}
              onClick={handleToggle}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                enabled ? 'bg-emerald-600' : 'bg-gray-300'
              } ${toggling ? 'opacity-70 cursor-wait' : ''}`}
              title={enabled ? 'Click to disable history logging' : 'Click to enable history logging'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Configuration Controls Body - only shown when enabled */}
        {enabled && (
          <div className="space-y-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Responsive 2-column Grid for clean layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Field 1: History Mode */}
              <CustomDropdown
                label="History Mode"
                value={historyMode}
                options={historyModeOptions}
                onChange={(val) => setHistoryMode(val as 'Time-based' | 'Conditional')}
                icon={<Clock size={15} />}
                disabled={loading}
              />

              {/* Field 2: Every Interval (when Time-based) or Conditional Criteria */}
              {historyMode === 'Time-based' ? (
                <CustomDropdown
                  label="Capture Interval (Every)"
                  value={historyInterval}
                  options={intervalOptions}
                  onChange={(val) => setHistoryInterval(val as 'minute' | 'hour' | 'day')}
                  icon={<Calendar size={15} />}
                  disabled={loading}
                />
              ) : (
                <div className="flex flex-col justify-end">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                    Trigger Condition
                  </label>
                  <div className="h-[42px] px-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-900 shadow-xs">
                    <Activity size={15} className="text-emerald-600 shrink-0" />
                    <span className="truncate">Auto-logs on pump run/stop, fault, or line pressure &Delta; &ge; 0.5 bar</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Row: Status Info + Actions */}
            <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border border-emerald-200 transition-all cursor-pointer shadow-xs"
                >
                  <Layers size={13} />
                  <span>View History Logs</span>
                </button>

                {lastHistoryAt && (
                  <span className="text-[11px] text-gray-400 font-medium hidden sm:inline flex items-center gap-1">
                    <Clock size={11} /> Last saved:{' '}
                    {new Date(lastHistoryAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all duration-200 shadow-sm cursor-pointer ${
                  saving
                    ? 'bg-emerald-500 text-white cursor-wait'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-emerald-600/20'
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} className="stroke-[2.5]" />
                    <span>Save History</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Historical Data Viewer Modal */}
      <HistoricalDataModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        deviceId={deviceId}
      />
    </>
  );
};
