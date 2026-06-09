import React from 'react';
import { Timer } from 'lucide-react';

interface DelaySettingsCardProps {
  pumpOnDelay: number;
  nextFillingTime: number;
  overloadResetDelay: number;
  underloadResetDelay: number;
}

export const DelaySettingsCard: React.FC<DelaySettingsCardProps> = ({
  pumpOnDelay = 0,
  nextFillingTime = 0,
  overloadResetDelay = 0,
  underloadResetDelay = 0
}) => {
  return (
    <div className="bg-[#0A2D5F] rounded-[20px] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)] border border-[rgba(255,255,255,0.08)] mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Timer size={18} color="#B66BFF" />
        <h2 className="text-[#B66BFF] font-bold text-sm tracking-widest uppercase">Pump Delay Settings</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-2 text-center">
        <div className="flex flex-col items-center justify-center sm:border-r border-b sm:border-b-0 border-[rgba(255,255,255,0.08)] pb-4 sm:pb-0">
          <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mb-2">Pump ON<br/>Delay (s)</span>
          <span className="text-2xl font-mono text-white font-bold tracking-widest">{pumpOnDelay}</span>
        </div>
        <div className="flex flex-col items-center justify-center sm:border-r border-b sm:border-b-0 border-[rgba(255,255,255,0.08)] pb-4 sm:pb-0">
          <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mb-2">Next Fill<br/>Time (m)</span>
          <span className="text-2xl font-mono text-white font-bold tracking-widest">{nextFillingTime}</span>
        </div>
        <div className="flex flex-col items-center justify-center sm:border-r border-b sm:border-b-0 border-[rgba(255,255,255,0.08)] pb-4 sm:pb-0">
          <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mb-2">Overload<br/>Reset (m)</span>
          <span className="text-2xl font-mono text-white font-bold tracking-widest">{overloadResetDelay}</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mb-2">Underload<br/>Reset (m)</span>
          <span className="text-2xl font-mono text-white font-bold tracking-widest">{underloadResetDelay}</span>
        </div>
      </div>
    </div>
  );
};
