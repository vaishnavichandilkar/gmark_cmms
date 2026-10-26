import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  X,
  CheckCircle2,
  Database,
  Loader2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { scheduleService } from '../../services/scheduleService';

interface CheckpointMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  machineId: number;
  onSuccess?: (createdObj: any) => void;
}

export function CheckpointMasterModal({
  isOpen,
  onClose,
  machineId,
  onSuccess,
}: CheckpointMasterModalProps) {
  const [checkpointType, setCheckpointType] = useState<'PREVENTIVE' | 'PREDICTIVE'>('PREVENTIVE');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('MONTHLY');
  const [category, setCategory] = useState('Safety & Mechanical');

  // Numerical limits / tolerance ranges
  const [standardValue, setStandardValue] = useState('');
  const [unit, setUnit] = useState('');
  const [minValue, setMinValue] = useState<string>('');
  const [maxValue, setMaxValue] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dualDBSaveResult, setDualDBSaveResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || description.trim().length < 5) {
      toast.error('Checkpoint Description must be at least 5 characters.');
      return;
    }

    setIsSubmitting(true);
    setDualDBSaveResult(null);

    try {
      const payload = {
        machineId,
        checkpointType,
        description: description.trim(),
        frequency,
        category,
        standardValue: standardValue || undefined,
        unit: unit || undefined,
        minValue: minValue !== '' ? Number(minValue) : undefined,
        maxValue: maxValue !== '' ? Number(maxValue) : undefined,
      };

      const result = await scheduleService.createCheckpointDualDB(payload);
      setDualDBSaveResult(result);

      if (result.isNewMasterCreated) {
        toast.success(
          `New Checkpoint "${result.master?.code}" created & persisted to BOTH Checkpoint Master DB and User DB!`,
          { icon: '💾' }
        );
      } else {
        toast.success(
          `Checkpoint matched existing Master DB ("${result.master?.code}"). Saved directly to User DB!`,
          { icon: '🔗' }
        );
      }

      if (onSuccess) onSuccess(result);
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create checkpoint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden my-6 flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-5 bg-[#1e293b] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0f2942] border border-cyan-500/30 flex items-center justify-center shrink-0">
                <FileText size={20} className="text-cyan-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg leading-tight tracking-tight text-white">Create Checkpoint</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Duplicate Validation & Dual Database Persistence</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[82vh]">
            {/* Type & Frequency Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  CHECKPOINT TYPE
                </label>
                <div className="flex rounded-xl bg-gray-100 p-1 border border-gray-200/80">
                  <button
                    type="button"
                    onClick={() => setCheckpointType('PREVENTIVE')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      checkpointType === 'PREVENTIVE'
                        ? 'bg-[#059669] text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-900 font-medium'
                    }`}
                  >
                    Preventive
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckpointType('PREDICTIVE')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      checkpointType === 'PREDICTIVE'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-gray-500 hover:text-gray-900 font-medium'
                    }`}
                  >
                    Predictive
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  FREQUENCY INTERVAL
                </label>
                <select
                  value={frequency}
                  onChange={e => setFrequency(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-emerald-500 cursor-pointer transition-all"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="BIMONTHLY">Bimonthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="HALF_YEARLY">Half-Yearly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
            </div>

            {/* Checkpoint Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                CHECKPOINT DESCRIPTION <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Inspect motor bearing vibration, thermography scan, or butterfly valve seal tight check..."
                className="w-full p-3.5 bg-white border border-gray-300 rounded-2xl text-xs font-medium text-gray-800 focus:border-emerald-500 outline-none transition-all placeholder-gray-400"
              />
            </div>

            {/* Numerical Limits & Tolerance Ranges */}
            <div className="space-y-3 bg-[#ecfeff]/50 border border-cyan-200/80 rounded-2xl p-4.5">
              <span className="text-[11px] font-bold text-cyan-900 uppercase tracking-wider block">
                NUMERICAL LIMITS & TOLERANCE RANGES
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-600 block">Standard Expected Value</label>
                  <input
                    type="text"
                    value={standardValue}
                    onChange={e => setStandardValue(e.target.value)}
                    placeholder="e.g. Pass / < 2.5 mm/s"
                    className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:border-cyan-500 transition-all placeholder-gray-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-600 block">Unit of Measurement</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    placeholder="e.g. mm/s, Bar, °C, %"
                    className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:border-cyan-500 transition-all placeholder-gray-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-600 block">Min Value Limit</label>
                  <input
                    type="number"
                    step="0.01"
                    value={minValue}
                    onChange={e => setMinValue(e.target.value)}
                    placeholder="e.g. 0.1"
                    className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:border-cyan-500 transition-all placeholder-gray-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-600 block">Max Value Limit</label>
                  <input
                    type="number"
                    step="0.01"
                    value={maxValue}
                    onChange={e => setMaxValue(e.target.value)}
                    placeholder="e.g. 3.5"
                    className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-none focus:border-cyan-500 transition-all placeholder-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* Dual DB Result Banner */}
            {dualDBSaveResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <Database size={18} className="text-emerald-600 shrink-0" />
                <span>
                  Saved to User Database & Checkpoint Master DB (Code: <strong>{dualDBSaveResult.master?.code}</strong>).
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-[#f1f5f9] hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-full cursor-pointer transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs rounded-full flex items-center gap-2 shadow-sm cursor-pointer transition-all active:scale-95 disabled:opacity-70"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                Validate & Save (Dual Database)
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
