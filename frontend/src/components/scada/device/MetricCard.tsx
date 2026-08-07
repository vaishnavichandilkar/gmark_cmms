import React from 'react';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  valueColor?: string;
  unit?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, valueColor = 'text-gray-800', unit }) => {
  return (
    <div className="bg-black/20 rounded-2xl p-3 sm:p-4 border border-white/10 shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)] flex items-center gap-3 sm:gap-4 transition-all duration-300 hover:scale-[1.02] hover:bg-black/30 hover:border-blue-500/20 hover:shadow-[0_8px_20px_rgba(0,100,255,0.04)] min-w-0">
      <div className="flex-shrink-0 flex items-center justify-center p-2 sm:p-3 bg-white/5 rounded-xl border border-white/5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.03)] text-base sm:text-2xl md:text-3xl">
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] sm:text-xs md:text-sm text-gray-400 font-semibold uppercase tracking-wider truncate">{label}</span>
        <div className="flex items-baseline gap-0.5 sm:gap-1 mt-0.5">
          <span className={`text-[12px] sm:text-lg md:text-xl lg:text-2xl font-black truncate tracking-tight ${valueColor === 'text-gray-800' ? 'text-white' : valueColor}`}>{value}</span>
          {unit && <span className="text-[9px] sm:text-xs md:text-sm font-semibold text-gray-400 ml-0.5">{unit}</span>}
        </div>
      </div>
    </div>
  );
};
