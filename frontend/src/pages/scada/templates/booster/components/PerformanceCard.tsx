import React from 'react';
import { Zap } from 'lucide-react';

interface PerformanceCardProps {
  voltageR?: number;
  voltageY?: number;
  voltageB?: number;
  currentR?: number;
  currentY?: number;
  currentB?: number;
  inputPowerStatus?: number;
}

export const PerformanceCard: React.FC<PerformanceCardProps> = ({ 
  voltageR = 0, voltageY = 0, voltageB = 0, 
  currentR = 0, currentY = 0, currentB = 0, 
  inputPowerStatus = 0 
}) => {
  const avgVoltage = Math.round((voltageR + voltageY + voltageB) / 3);
  const totalCurrent = (currentR + currentY + currentB).toFixed(1);

  const getPowerStatus = (statusValue: number) => {
    switch (statusValue) {
      case 0: return { text: 'INPUT POWER OK', color: 'text-[#22c55e]', border: 'border-[#22c55e]', bg: 'bg-[#22c55e]/10' };
      case 1: return { text: 'R PHASE FAULT', color: 'text-[#ef4444]', border: 'border-[#ef4444]', bg: 'bg-[#ef4444]/10' };
      case 2: return { text: 'Y PHASE FAULT', color: 'text-[#eab308]', border: 'border-[#eab308]', bg: 'bg-[#eab308]/10' };
      case 3: return { text: 'B PHASE FAULT', color: 'text-[#3b82f6]', border: 'border-[#3b82f6]', bg: 'bg-[#3b82f6]/10' };
      case 4: return { text: 'PHASE REVERSE', color: 'text-[#f97316]', border: 'border-[#f97316]', bg: 'bg-[#f97316]/10' };
      case 5: return { text: 'NO POWER', color: 'text-[#dc2626]', border: 'border-[#dc2626]', bg: 'bg-[#dc2626]/10' };
      default: return { text: 'UNKNOWN STATUS', color: 'text-gray-400', border: 'border-gray-500', bg: 'bg-gray-500/10' };
    }
  };

  const statusObj = getPowerStatus(inputPowerStatus);

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
          <div className={`mt-1 px-4 py-2 rounded-full border ${statusObj.border} ${statusObj.bg} flex items-center justify-center shadow-sm backdrop-blur-md transition-all duration-300`}>
            <span className={`font-bold text-sm tracking-wider uppercase ${statusObj.color}`}>
              {statusObj.text}
            </span>
          </div>
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
