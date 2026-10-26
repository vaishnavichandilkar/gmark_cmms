import React from 'react';
import { ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

export interface GiveAccessPromptModalProps {
  isOpen: boolean;
  targetType: 'facility' | 'machine';
  targetName: string;
  targetCode?: string;
  onGiveAccess: () => void;
  onSkip: () => void;
}

export function GiveAccessPromptModal({
  isOpen,
  targetType,
  targetName,
  targetCode,
  onGiveAccess,
  onSkip,
}: GiveAccessPromptModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99998] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 text-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
          <ShieldCheck className="w-9 h-9" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
          <CheckCircle2 size={13} className="text-emerald-600" />
          <span>{targetType === 'facility' ? 'Facility' : 'Machine'} Created Successfully!</span>
        </div>

        <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2">
          Give Access to {targetName}?
        </h3>

        <p className="text-xs text-slate-500 leading-relaxed mb-6 px-2">
          {targetCode && <span className="font-mono font-medium text-slate-600">[{targetCode}] </span>}
          You can immediately assign technicians, operators, and staff who can view and manage this {targetType}, or configure access later.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={onSkip}
            className="w-full sm:w-1/2 py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
          >
            Skip &amp; Done
          </button>

          <button
            type="button"
            onClick={onGiveAccess}
            className="w-full sm:w-1/2 py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-600/25 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span>Give Access</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
