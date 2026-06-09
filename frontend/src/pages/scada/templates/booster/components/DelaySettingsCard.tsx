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
    <div className="liquid-glass rounded-[24px] mb-4 transition-all duration-300 hover:-translate-y-[3px] p-5">
      <div className="flex items-center gap-2 mb-4">
        <Timer size={18} className="text-[#BF5AF2]" />
        <h2 className="text-white font-semibold text-sm tracking-widest uppercase">Pump Delay Settings</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-2 text-center">
        <div className="flex flex-col items-center justify-center sm:border-r border-b sm:border-b-0 border-[rgba(255,255,255,0.08)] pb-4 sm:pb-0">
          <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mb-2">Pump ON<br />Delay (s)</span>
          <span className="text-2xl font-mono text-white font-bold tracking-widest">{pumpOnDelay}</span>
        </div>
        <div className="flex flex-col items-center justify-center sm:border-r border-b sm:border-b-0 border-[rgba(255,255,255,0.08)] pb-4 sm:pb-0">
          <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mb-2">Next Fill<br />Time (m)</span>
          <span className="text-2xl font-mono text-white font-bold tracking-widest">{nextFillingTime}</span>
        </div>
        <div className="flex flex-col items-center justify-center sm:border-r border-b sm:border-b-0 border-[rgba(255,255,255,0.08)] pb-4 sm:pb-0">
          <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mb-2">Overload<br />Reset (m)</span>
          <span className="text-2xl font-mono text-white font-bold tracking-widest">{overloadResetDelay}</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mb-2">Underload<br />Reset (m)</span>
          <span className="text-2xl font-mono text-white font-bold tracking-widest">{underloadResetDelay}</span>
        </div>
      </div>
    </div>
  );
};
