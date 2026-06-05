import React from 'react';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  valueColor?: string;
  unit?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, valueColor = 'text-textMain', unit }) => {
  return (
    <div className="bg-white rounded-xl p-2 sm:p-4 border border-gray-100 shadow-sm flex items-center gap-1.5 sm:gap-4 transition-all hover:shadow-md hover:border-gray-200 min-w-0">
      <div className="flex-shrink-0 text-base sm:text-2xl md:text-3xl">
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[9px] sm:text-xs md:text-sm text-textMuted font-medium truncate">{label}</span>
        <div className="flex items-baseline gap-0.5 sm:gap-1">
          <span className={`text-[11px] sm:text-lg md:text-xl lg:text-2xl font-bold truncate ${valueColor}`}>{value}</span>
          {unit && <span className="text-[8px] sm:text-xs md:text-sm font-medium text-textMuted">{unit}</span>}
        </div>
      </div>
    </div>
  );
};
