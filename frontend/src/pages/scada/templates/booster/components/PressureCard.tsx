import React from 'react';
import { Gauge } from 'lucide-react';

interface PressureCardProps {
  pressure?: number;
}

export const PressureCard: React.FC<PressureCardProps> = ({ pressure = 0.0 }) => {
  return (
    <div className="scada-card flex flex-col justify-between">
      <div className="scada-card-title">
        <Gauge size={16} className="text-gray-400" />
        <h2>PRESSURE</h2>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center flex-1 py-1 gap-2 sm:gap-0">
        {/* Left metrics */}
        <div className="flex flex-col items-center justify-center w-full sm:w-1/2 sm:pr-4 sm:border-r border-gray-100 mb-2 sm:mb-0">
          <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Current Pressure</span>
          <span className="text-gray-900 font-bold text-3xl">{pressure.toFixed(1)} <span className="text-sm font-semibold text-gray-500">bar</span></span>
        </div>

        {/* Right Legends */}
        <div className="flex flex-col gap-2 w-full sm:w-1/2 sm:pl-4 justify-center">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#3b82f6] rounded-full"></span> PT-Value
            </span>
            <span className="text-[#3b82f6] font-bold">10.0 BAR</span>
          </div>
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#ef4444] rounded-full"></span> Pump Off
            </span>
            <span className="text-[#ef4444] font-bold">3.0 BAR</span>
          </div>
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#eab308] rounded-full"></span> Set Point
            </span>
            <span className="text-[#eab308] font-bold">2.5 BAR</span>
          </div>
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full"></span> Pump On
            </span>
            <span className="text-[#22c55e] font-bold">2.0 BAR</span>
          </div>
        </div>
      </div>
    </div>
  );
};
