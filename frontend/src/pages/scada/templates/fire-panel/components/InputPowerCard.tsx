import React from 'react';
import { Zap } from 'lucide-react';

interface InputPowerCardProps {
  currentR?: number;
  currentY?: number;
  currentB?: number;
  inputPowerStatus?: number;
}

export const InputPowerCard: React.FC<InputPowerCardProps> = ({ 
  currentR = 0, currentY = 0, currentB = 0, 
  inputPowerStatus = 0 
}) => {
  const totalCurrent = (currentR + currentY + currentB).toFixed(1);

  const getPowerStatus = (statusValue: number) => {
    switch (statusValue) {
      case 0: return { text: 'INPUT POWER OK', color: 'text-[#22c55e]', bg: 'bg-[#22c55e]/10' };
      case 1: return { text: 'R PHASE FAULT', color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10' };
      case 2: return { text: 'Y PHASE FAULT', color: 'text-[#eab308]', bg: 'bg-[#eab308]/10' };
      case 3: return { text: 'B PHASE FAULT', color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/10' };
      case 4: return { text: 'PHASE REVERSE', color: 'text-[#f97316]', bg: 'bg-[#f97316]/10' };
      case 5: return { text: 'NO POWER', color: 'text-[#dc2626]', bg: 'bg-[#dc2626]/10' };
      default: return { text: 'UNKNOWN STATUS', color: 'text-gray-400', bg: 'bg-gray-100' };
    }
  };

  const statusObj = getPowerStatus(inputPowerStatus);

  return (
    <div className="scada-card flex flex-col justify-between relative">
      <div className="scada-card-title">
        <Zap size={16} className="text-gray-400" />
        <h2>INPUT POWER</h2>
      </div>

      <div className="flex flex-col items-center flex-1 justify-center py-1">
        <div className="scada-metric-value mb-1">
          {totalCurrent} <span className="text-sm text-gray-500 font-semibold">A</span>
        </div>

        <div className={`mb-2 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider ${statusObj.bg} ${statusObj.color}`}>
          {statusObj.text}
        </div>

        <div className="flex gap-4 w-full justify-center">
          <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
            <span className="text-gray-700">{currentR.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#eab308]"></span>
            <span className="text-gray-700">{currentY.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span>
            <span className="text-gray-700">{currentB.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
