import React from 'react';
import { Timer } from 'lucide-react';

export const DelaySettingsCard: React.FC = () => {
  return (
    <div className="bg-[#0A2D5F] rounded-[20px] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)] border border-[rgba(255,255,255,0.08)] mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Timer size={18} color="#B66BFF" />
        <h2 className="text-[#B66BFF] font-bold text-sm tracking-widest uppercase">Pump Delay Settings</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-4 text-center">
        <div className="flex flex-col sm:border-r border-b sm:border-b-0 border-[rgba(255,255,255,0.08)] pb-4 sm:pb-0">
          <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mb-2">Next Pump<br/>Starting Delay</span>
          <span className="text-xl font-mono text-white font-bold tracking-widest">00:00</span>
        </div>
        <div className="flex flex-col sm:border-r border-b sm:border-b-0 border-[rgba(255,255,255,0.08)] pb-4 sm:pb-0">
          <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mb-2">Start Refilling<br/>After</span>
          <span className="text-xl font-mono text-white font-bold tracking-widest">00:00</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mb-2">Pump Shift<br/>Remaining Time</span>
          <span className="text-xl font-mono text-white font-bold tracking-widest">03:00</span>
        </div>
      </div>
    </div>
  );
};
