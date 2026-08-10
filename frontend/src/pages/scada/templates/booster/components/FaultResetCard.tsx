import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  hasFault?: boolean;
}

export const FaultResetCard: React.FC<Props> = ({ hasFault = false }) => {
  return (
    <div className={`scada-card flex flex-col h-full ${hasFault ? 'border-[#ef4444] bg-[#ef4444]/5' : ''}`}>
      <div className="scada-card-title">
        <AlertTriangle size={16} className={hasFault ? 'text-[#ef4444] animate-pulse' : 'text-gray-400'} />
        <h2 className={hasFault ? 'text-[#ef4444]' : ''}>FAULTS RESET DELAY SETTINGS</h2>
      </div>

      <div className="flex flex-col gap-3 flex-1 justify-center">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">OVERLOAD FAULT RESET TIME</span>
          <div className="bg-white border border-gray-200 rounded px-3 py-1 shadow-sm">
            <span className="font-mono text-sm font-bold text-gray-900">00:00</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">UNDER-LOAD FAULT RESET TIME</span>
          <div className="bg-white border border-gray-200 rounded px-3 py-1 shadow-sm">
            <span className="font-mono text-sm font-bold text-gray-900">00:00</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">VFD FAULT RESET TIME</span>
          <div className="bg-white border border-gray-200 rounded px-3 py-1 shadow-sm">
            <span className="font-mono text-sm font-bold text-gray-900">00:00</span>
          </div>
        </div>
      </div>
    </div>
  );
};
