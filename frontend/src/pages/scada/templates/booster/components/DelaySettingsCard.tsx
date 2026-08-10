import React from 'react';
import { Timer } from 'lucide-react';

interface DelaySettingsCardProps {
  pumpOnDelay: number;
  nextFillingTime: number;
  overloadResetDelay: number;
  underloadResetDelay: number;
  vfdResetAfter?: number;
}

export const DelaySettingsCard: React.FC<DelaySettingsCardProps> = ({
  pumpOnDelay = 0,
  nextFillingTime = 0,
  overloadResetDelay = 0,
  underloadResetDelay = 0,
  vfdResetAfter = 0
}) => {
  const settings = [
    { title: 'PUMP ON DELAY', value: pumpOnDelay, unit: 's', border: 'border-[#a855f7]', text: 'text-[#a855f7]' },
    { title: 'NEXT FILL TIME', value: nextFillingTime, unit: 's', border: 'border-[#06b6d4]', text: 'text-[#06b6d4]' },
    { title: 'OVERLOAD RESET', value: overloadResetDelay, unit: 's', border: 'border-[#ef4444]', text: 'text-[#ef4444]' },
    { title: 'UNDERLOAD RESET', value: underloadResetDelay, unit: 's', border: 'border-[#f97316]', text: 'text-[#f97316]' },
    { title: 'VFD RESET AFTER', value: vfdResetAfter, unit: 's', border: 'border-[#22c55e]', text: 'text-[#22c55e]' }
  ];

  return (
    <div className="scada-card flex flex-col h-full">
      <div className="scada-card-title">
        <Timer size={16} className="text-gray-400" />
        <h2>PUMP DELAY SETTINGS</h2>
      </div>

      <div className="flex flex-row justify-between gap-2 flex-1">
        {settings.map((item, idx) => (
          <div key={idx} className="flex flex-col items-center justify-between flex-1 bg-gray-50 border border-gray-100 rounded-lg p-2">
            <span className="text-[9px] text-gray-500 font-bold tracking-wider uppercase text-center h-8 flex items-center justify-center">
              {item.title}
            </span>
            <div className={`w-full flex items-center justify-center border-2 border-dashed ${item.border} bg-white rounded py-1`}>
              <span className={`font-bold font-mono text-sm ${item.text}`}>{item.value}{item.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
