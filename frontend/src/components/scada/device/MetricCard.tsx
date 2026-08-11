import React from 'react';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  valueColor?: string;
  unit?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, valueColor = 'text-gray-900', unit }) => {
  return (
    <div className="bg-gray-50 rounded-2xl p-3 sm:p-4 border border-gray-200 shadow-sm flex items-center gap-3 sm:gap-4 transition-all duration-300 hover:scale-[1.02] hover:bg-gray-100 hover:border-[#00a651]/20 hover:shadow-md min-w-0">
      <div className="flex-shrink-0 flex items-center justify-center p-2 sm:p-3 bg-white rounded-xl border border-gray-200 shadow-sm text-base sm:text-2xl md:text-3xl">
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] sm:text-xs md:text-sm text-gray-500 font-semibold uppercase tracking-wider truncate">{label}</span>
        <div className="flex items-baseline gap-0.5 sm:gap-1 mt-0.5">
          <span className={`text-[12px] sm:text-lg md:text-xl lg:text-2xl font-black truncate tracking-tight ${valueColor === 'text-gray-900' ? 'text-gray-900' : valueColor}`}>{value}</span>
          {unit && <span className="text-[9px] sm:text-xs md:text-sm font-semibold text-gray-500 ml-0.5">{unit}</span>}
        </div>
      </div>
    </div>
  );
};
