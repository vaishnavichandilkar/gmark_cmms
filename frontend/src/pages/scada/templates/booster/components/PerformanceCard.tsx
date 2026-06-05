import React from 'react';
import { Zap, Activity, Waves } from 'lucide-react';

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
    <div className="bg-[#0A2D5F] rounded-[20px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)] border border-[rgba(255,255,255,0.08)] mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={18} color="#00E5FF" />
        <h2 className="text-[#00E5FF] font-bold text-sm tracking-widest uppercase">Performance</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-4 text-center">
        {/* Voltage */}
        <div className="flex flex-col items-center justify-center sm:border-r border-b sm:border-b-0 border-[rgba(255,255,255,0.08)] pb-4 sm:pb-0 sm:pr-4">
          <div className="text-xs text-gray-400 font-semibold mb-2 tracking-wider uppercase">
            Voltage
          </div>
          <div className="text-3xl font-bold text-white font-mono tracking-tight">{avgVoltage} <span className="text-sm font-normal text-gray-400">V</span></div>
          <div className="flex gap-5 text-sm font-mono mt-2">
            <div className="flex flex-col items-center"><span className="text-red-500 font-bold">R</span><span className="text-white">{voltageR}</span></div>
            <div className="flex flex-col items-center"><span className="text-yellow-500 font-bold">Y</span><span className="text-white">{voltageY}</span></div>
            <div className="flex flex-col items-center"><span className="text-blue-500 font-bold">B</span><span className="text-white">{voltageB}</span></div>
          </div>
        </div>

        {/* Input Power */}
        <div className="flex flex-col items-center justify-center sm:border-r border-b sm:border-b-0 border-[rgba(255,255,255,0.08)] pb-4 sm:pb-0 sm:px-2">
          <div className="text-xs text-gray-400 font-semibold mb-3 tracking-wider uppercase">
            Input Power
          </div>
          <div className="text-3xl font-bold text-white mt-1">{power.toFixed(1)} <span className="text-sm font-normal text-gray-400">kW</span></div>
        </div>

        {/* Current */}
        <div className="flex flex-col items-center justify-center sm:pl-2">
          <div className="text-xs text-gray-400 font-semibold mb-2 tracking-wider uppercase">
            Current
          </div>
          <div className="text-3xl font-bold text-white mt-1">{totalCurrent} <span className="text-sm font-normal text-gray-400">A</span></div>
          <div className="flex gap-5 text-sm font-mono mt-2">
            <div className="flex flex-col items-center"><span className="text-red-500 font-bold">R</span><span className="text-white">{currentR.toFixed(1)}</span></div>
            <div className="flex flex-col items-center"><span className="text-yellow-500 font-bold">Y</span><span className="text-white">{currentY.toFixed(1)}</span></div>
            <div className="flex flex-col items-center"><span className="text-blue-500 font-bold">B</span><span className="text-white">{currentB.toFixed(1)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
