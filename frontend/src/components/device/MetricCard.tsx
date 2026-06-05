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
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md hover:border-gray-200">
      <div className="flex-shrink-0 text-3xl">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-sm text-textMuted font-medium">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold ${valueColor}`}>{value}</span>
          {unit && <span className="text-sm font-medium text-textMuted">{unit}</span>}
        </div>
      </div>
    </div>
  );
};
