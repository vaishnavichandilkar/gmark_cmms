import React from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  faultsCount: number;
  icon?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, faultsCount, icon }) => {
  return (
    <div className="flex items-center justify-between w-full mb-6">
      <div className="flex items-center gap-3">
        {icon || <ShieldCheck size={28} className="text-emerald-600" />}
        <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <span>Faults: {faultsCount}</span>
        <CheckCircle2 size={18} className="text-[#00a651] fill-emerald-100" />
      </div>
    </div>
  );
};
