import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  hasFault?: boolean;
}

export const FaultResetCard: React.FC<Props> = ({ hasFault = false }) => {
  const cardClass = hasFault 
    ? 'liquid-glass-fault rounded-[24px] p-5 transition-all duration-300 hover:-translate-y-[3px]'
    : 'liquid-glass rounded-[24px] p-5 transition-all duration-300 hover:-translate-y-[3px]';

  return (
    <div className={cardClass}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} className={`text-[#FF453A] ${hasFault ? 'animate-pulse' : ''}`} />
        <h2 className="text-white font-semibold text-sm tracking-widest uppercase">Faults Reset Delay Settings</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-4 text-center">
        <div className="flex flex-col items-center justify-center sm:border-r border-b sm:border-b-0 border-white/[0.03] pb-4 sm:pb-0">
          <span className="text-xs text-[rgba(255,255,255,0.45)] font-semibold tracking-wider uppercase mb-2">Overload Fault<br/>Reset Time</span>
          <span className="text-3xl font-mono text-white font-semibold tracking-widest">00:00</span>
        </div>
        <div className="flex flex-col items-center justify-center sm:border-r border-b sm:border-b-0 border-white/[0.03] pb-4 sm:pb-0">
          <span className="text-xs text-[rgba(255,255,255,0.45)] font-semibold tracking-wider uppercase mb-2">Under-Load Fault<br/>Reset Time</span>
          <span className="text-3xl font-mono text-white font-semibold tracking-widest">00:00</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="text-xs text-[rgba(255,255,255,0.45)] font-semibold tracking-wider uppercase mb-2">VFD Fault<br/>Reset Time</span>
          <span className="text-3xl font-mono text-white font-semibold tracking-widest">00:00</span>
        </div>
      </div>
    </div>
  );
};
