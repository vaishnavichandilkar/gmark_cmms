import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sliders, X, Check, Cpu, Wrench } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { api } from '../../lib/api';
import { setUser } from '../../store/slices/authSlice';
import type { RootState } from '../../store';
import toast from 'react-hot-toast';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PreferencesModal({ isOpen, onClose }: PreferencesModalProps) {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [updating, setUpdating] = useState<string | null>(null);

  const currentAccess = user?.moduleAccess || 'BOTH';
  const isCmmsActive = currentAccess === 'BOTH' || currentAccess === 'CMMS';
  const isIotActive = currentAccess === 'BOTH' || currentAccess === 'IOT';

  const packages = [
    {
      id: 'CMMS' as const,
      title: 'CMMS',
      desc: 'Work orders, maintenance schedules, asset hierarchy, and preventive maintenance',
      icon: Wrench,
      badge: 'CMMS',
    },
    {
      id: 'IOT' as const,
      title: 'IoT SCADA',
      desc: 'Live sensor telemetry, machine health, alert triggers, and real-time SCADA views',
      icon: Cpu,
      badge: 'SCADA',
    },
  ];

  const handleToggleModule = async (moduleId: 'CMMS' | 'IOT') => {
    let nextCmms = isCmmsActive;
    let nextIot = isIotActive;

    if (moduleId === 'CMMS') {
      nextCmms = !nextCmms;
    } else {
      nextIot = !nextIot;
    }

    // Must have at least one module selected
    if (!nextCmms && !nextIot) {
      toast.error('At least one industrial module must remain selected');
      return;
    }

    const nextAccess: 'CMMS' | 'IOT' | 'BOTH' =
      nextCmms && nextIot ? 'BOTH' : nextCmms ? 'CMMS' : 'IOT';

    if (nextAccess === currentAccess) return;

    try {
      setUpdating(moduleId);
      const updatedUser = { ...user, moduleAccess: nextAccess };
      dispatch(setUser(updatedUser));
      await api.patch('/auth/module-access', { moduleAccess: nextAccess });

      const label =
        nextAccess === 'BOTH'
          ? 'Both CMMS & IoT SCADA enabled'
          : nextAccess === 'CMMS'
          ? 'CMMS enabled'
          : 'IoT SCADA enabled';
      toast.success(label);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update module preferences');
    } finally {
      setUpdating(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-xl relative z-10 overflow-hidden border border-slate-200/80"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#15803D] border border-emerald-200/60 flex items-center justify-center">
                <Sliders size={16} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  System Preferences
                </h2>
                <p className="text-[11px] text-slate-500">
                  Select your active industrial modules (multi-select enabled)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content: Multi-selective Module Options */}
          <div className="p-6 space-y-3">
            {packages.map((pkg) => {
              const Icon = pkg.icon;
              const isSelected = pkg.id === 'CMMS' ? isCmmsActive : isIotActive;
              const isBusy = updating === pkg.id;

              return (
                <div
                  key={pkg.id}
                  onClick={() => !updating && handleToggleModule(pkg.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 select-none ${
                    isSelected
                      ? 'border-[#15803D] bg-emerald-50/60 shadow-xs ring-1 ring-[#15803D]'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? 'bg-[#15803D] text-white border-emerald-700'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-900">
                          {pkg.title}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-[#15803D] text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {pkg.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {pkg.desc}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    {isBusy ? (
                      <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    ) : isSelected ? (
                      <div className="w-6 h-6 rounded-lg bg-[#15803D] text-white flex items-center justify-center shadow-xs">
                        <Check size={14} strokeWidth={2.5} />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-lg border-2 border-slate-300 bg-white hover:border-slate-400 transition-colors" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Changes take effect immediately across all navigation views.</span>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

