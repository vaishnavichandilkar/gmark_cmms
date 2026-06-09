import React from 'react';
import { Gauge, Radio } from 'lucide-react';

interface PressureCardProps {
  pressure?: number;
  isConnected?: boolean;
}

export const PressureCard: React.FC<PressureCardProps> = ({ pressure = 0.0, isConnected = false }) => {
  return (
    <div className="liquid-glass rounded-[24px] mb-4 transition-all duration-300 hover:-translate-y-[3px] p-5">
      <div className="flex items-center gap-2 mb-4">
        <Gauge size={18} className="text-[#0A84FF]" />
        <h2 className="text-white font-semibold text-sm tracking-widest uppercase">Pressure</h2>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-6 sm:gap-0">
        {/* Left metrics */}
        <div className="flex flex-col items-center gap-4 w-full sm:w-[70%] pr-4 border-b sm:border-b-0 sm:border-r border-white/[0.03] pb-5 sm:pb-0">
          <div className="flex flex-col items-center text-sm mb-1">
            <span className="text-[rgba(255,255,255,0.45)] font-semibold uppercase tracking-wider mb-2">Current Pressure</span>
            <span className="text-white font-bold text-4xl">{pressure.toFixed(1)} <span className="text-lg font-semibold text-[rgba(255,255,255,0.45)]">bar</span></span>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-[220px]">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[rgba(255,255,255,0.75)] font-semibold uppercase tracking-wider flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#0A84FF] rounded-full"></span> PT-Value</span>
              <span className="text-[#0A84FF] font-bold">10.0 BAR</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[rgba(255,255,255,0.75)] font-semibold uppercase tracking-wider flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FFD60A] rounded-full"></span> Pump Off</span>
              <span className="text-[#FFD60A] font-bold">3.0 BAR</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[rgba(255,255,255,0.75)] font-semibold uppercase tracking-wider flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#FF453A] rounded-full"></span> Set Point</span>
              <span className="text-[#FF453A] font-bold">2.5 BAR</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[rgba(255,255,255,0.75)] font-semibold uppercase tracking-wider flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#30D158] rounded-full"></span> Pump On</span>
              <span className="text-[#30D158] font-bold">2.0 BAR</span>
            </div>
          </div>
        </div>

        {/* Right transmitter */}
        <div className="flex flex-col items-center justify-center sm:border-l border-t sm:border-t-0 border-white/[0.03] pt-5 sm:pt-0 sm:pl-6 w-full sm:w-[30%]">
          <span className="text-[rgba(255,255,255,0.45)] text-sm font-semibold tracking-widest uppercase mb-4">Transmitter</span>
          <div className="relative flex items-center justify-center w-12 h-12 mb-3">
            {/* Pulsing signal rings */}
            {isConnected && (
              <>
                <div className="absolute w-full h-full border-2 border-[#30D158]/30 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-30"></div>
                <div className="absolute w-8 h-8 border-2 border-[#30D158]/40 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s] opacity-45"></div>
              </>
            )}
            <Radio size={24} className={`${isConnected ? 'text-[#30D158]' : 'text-[#FF453A]'} relative z-10`} />
          </div>
          <span className={`${isConnected ? 'text-[#30D158]' : 'text-[#FF453A]'} text-sm font-bold tracking-widest uppercase`}>{isConnected ? 'Connected' : 'Disconnected'}</span>
          <div className={`w-2 h-2 ${isConnected ? 'bg-[#30D158]' : 'bg-[#FF453A]'} rounded-full mt-2`}></div>
        </div>
      </div>
    </div>
  );
};
