import React from 'react';
import { Gauge, Radio } from 'lucide-react';

export const PressureCard: React.FC = () => {
  return (
    <div className="bg-[#0A2D5F] rounded-[20px] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)] border border-[rgba(255,255,255,0.08)] mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Gauge size={18} color="#00A3FF" />
        <h2 className="text-[#00A3FF] font-bold text-sm tracking-widest uppercase">Pressure</h2>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-6 sm:gap-0">
        {/* Left metrics */}
        <div className="flex flex-col items-center gap-4 w-full sm:w-1/2 pr-4 border-b sm:border-b-0 sm:border-r border-[rgba(255,255,255,0.08)] pb-5 sm:pb-0">
          <div className="flex flex-col items-center text-sm mb-1">
            <span className="text-gray-400 font-semibold uppercase tracking-wider mb-2">Current Pressure</span>
            <span className="text-[#00E5FF] font-bold text-3xl">0.0 <span className="text-sm font-normal text-gray-400">bar</span></span>
          </div>
          
          <div className="flex flex-col gap-3 w-full max-w-[220px]">
            <div className="flex justify-between items-center text-xs">
              <span className="text-blue-400 font-semibold uppercase tracking-wider flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> PT-Value</span>
              <span className="text-blue-400 font-bold">10.0 BAR</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-orange-400 font-semibold uppercase tracking-wider flex items-center gap-2"><span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span> Pump Off</span>
              <span className="text-orange-400 font-bold">3.0 BAR</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-red-400 font-semibold uppercase tracking-wider flex items-center gap-2"><span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> Set Point</span>
              <span className="text-red-400 font-bold">2.5 BAR</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-green-400 font-semibold uppercase tracking-wider flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Pump On</span>
              <span className="text-green-400 font-bold">2.0 BAR</span>
            </div>
          </div>
        </div>

        {/* Right transmitter */}
        <div className="flex flex-col items-center justify-center sm:border-l border-t sm:border-t-0 border-[rgba(255,255,255,0.08)] pt-5 sm:pt-0 sm:pl-6 w-full sm:w-1/2">
          <span className="text-gray-400 text-xs font-semibold tracking-widest uppercase mb-4">Transmitter</span>
          <div className="relative flex items-center justify-center w-12 h-12 mb-3">
            {/* Pulsing signal rings */}
            <div className="absolute w-full h-full border-2 border-green-500 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-50"></div>
            <div className="absolute w-8 h-8 border-2 border-green-500 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s] opacity-70"></div>
            <Radio size={24} className="text-green-500 relative z-10" />
          </div>
          <span className="text-green-500 text-xs font-bold tracking-widest uppercase">Connected</span>
          <div className="w-2 h-2 border-2 border-green-500 rounded-full mt-2"></div>
        </div>
      </div>
    </div>
  );
};
