import React from 'react';
import { Zap } from 'lucide-react';

interface PerformanceCardProps {
  voltageR?: number;
  voltageY?: number;
  voltageB?: number;
  currentR?: number;
  currentY?: number;
  currentB?: number;
  power?: number;
}

export const PerformanceCard: React.FC<PerformanceCardProps> = ({ 
  voltageR = 0, voltageY = 0, voltageB = 0, 
  currentR = 0, currentY = 0, currentB = 0, 
  power = 0 
}) => {
  const avgVoltage = Math.round((voltageR + voltageY + voltageB) / 3);
  const totalCurrent = (currentR + currentY + currentB).toFixed(1);

  return (
    <div className="liquid-glass rounded-[24px] mb-6 transition-all duration-300 hover:-translate-y-[3px] p-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={18} className="text-[#0A84FF]" />
        <h2 className="text-white font-semibold text-sm tracking-widest uppercase">Performance</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-4 text-center">
        {/* Voltage */}
        <div className="flex flex-col items-center justify-center sm:border-r border-b sm:border-b-0 border-white/[0.03] pb-4 sm:pb-0 sm:pr-4">
          <div className="text-xs text-[rgba(255,255,255,0.45)] font-semibold mb-2 tracking-wider uppercase">
            Voltage
          </div>
          <div className="text-4xl font-bold text-white font-mono tracking-tight">{avgVoltage} <span className="text-lg font-semibold text-[rgba(255,255,255,0.45)]">V</span></div>
          <div className="flex gap-5 text-base font-mono mt-2 font-semibold">
            <div className="flex flex-col items-center"><span className="text-[#FF453A] font-semibold">R</span><span className="text-white">{voltageR}</span></div>
            <div className="flex flex-col items-center"><span className="text-[#FFD60A] font-semibold">Y</span><span className="text-white">{voltageY}</span></div>
            <div className="flex flex-col items-center"><span className="text-[#0A84FF] font-semibold">B</span><span className="text-white">{voltageB}</span></div>
          </div>
        </div>

        {/* Input Power */}
        <div className="flex flex-col items-center justify-center sm:border-r border-b sm:border-b-0 border-white/[0.03] pb-4 sm:pb-0 sm:px-2">
          <div className="text-xs text-[rgba(255,255,255,0.45)] font-semibold mb-3 tracking-wider uppercase">
            Input Power
          </div>
          <div className="text-4xl font-bold text-white font-mono tracking-tight mt-1">{power.toFixed(1)} <span className="text-lg font-semibold text-[rgba(255,255,255,0.45)]">kW</span></div>
        </div>

        {/* Current */}
        <div className="flex flex-col items-center justify-center sm:pl-2">
          <div className="text-xs text-[rgba(255,255,255,0.45)] font-semibold mb-2 tracking-wider uppercase">
            Current
          </div>
          <div className="text-4xl font-bold text-white font-mono tracking-tight mt-1">{totalCurrent} <span className="text-lg font-semibold text-[rgba(255,255,255,0.45)]">A</span></div>
          <div className="flex gap-5 text-base font-mono mt-2 font-semibold">
            <div className="flex flex-col items-center"><span className="text-[#FF453A] font-semibold">R</span><span className="text-white">{currentR.toFixed(1)}</span></div>
            <div className="flex flex-col items-center"><span className="text-[#FFD60A] font-semibold">Y</span><span className="text-white">{currentY.toFixed(1)}</span></div>
            <div className="flex flex-col items-center"><span className="text-[#0A84FF] font-semibold">B</span><span className="text-white">{currentB.toFixed(1)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
