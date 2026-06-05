import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  hasFault?: boolean;
}

export const FaultResetCard: React.FC<Props> = ({ hasFault = false }) => {
  return (
    <div className={`bg-[#0A2D5F] rounded-[20px] p-5 border transition-all duration-300 ${hasFault ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'border-[rgba(255,255,255,0.08)] shadow-[0_10px_30px_rgba(0,0,0,0.25)]'}`}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} color="#FF5D8F" className={hasFault ? 'animate-pulse' : ''} />
        <h2 className="text-[#FF5D8F] font-bold text-sm tracking-widest uppercase">Faults Reset Delay Settings</h2>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="flex flex-col border-r border-[rgba(255,255,255,0.08)]">
          <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mb-2">Overload Fault<br/>Reset Time</span>
          <span className="text-xl font-mono text-white font-bold tracking-widest">00:00</span>
        </div>
        <div className="flex flex-col border-r border-[rgba(255,255,255,0.08)]">
          <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mb-2">Under-Load Fault<br/>Reset Time</span>
          <span className="text-xl font-mono text-white font-bold tracking-widest">00:00</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mb-2">VFD Fault<br/>Reset Time</span>
          <span className="text-xl font-mono text-white font-bold tracking-widest">00:00</span>
        </div>
      </div>
    </div>
  );
};
