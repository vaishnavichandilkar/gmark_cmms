import React from 'react';
import { Activity } from 'lucide-react';

interface VoltageCardProps {
  voltageR?: number;
  voltageY?: number;
  voltageB?: number;
}

export const VoltageCard: React.FC<VoltageCardProps> = ({ 
  voltageR = 0, voltageY = 0, voltageB = 0 
}) => {
  const avgVoltage = Math.round((voltageR + voltageY + voltageB) / 3) || 0;

  return (
    <div className="scada-card flex flex-col justify-between">
      <div className="scada-card-title">
        <Activity size={16} className="text-gray-400" />
        <h2>VOLTAGE</h2>
      </div>

      <div className="flex flex-col items-center flex-1 justify-center py-1">
        <div className="scada-metric-value mb-2">
          {avgVoltage} <span className="text-sm text-gray-500 font-semibold">V</span>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-4 w-full justify-center">
          <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
            <span className="text-gray-700">{voltageR}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#eab308]"></span>
            <span className="text-gray-700">{voltageY}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span>
            <span className="text-gray-700">{voltageB}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
