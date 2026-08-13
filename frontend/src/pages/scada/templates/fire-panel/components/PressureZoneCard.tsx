import React from 'react';

export interface PressureZoneCardProps {
  title: string;
  pressure: number;
  status: 'NORMAL' | 'FAULT';
}

export const PressureZoneCard: React.FC<PressureZoneCardProps> = ({
  title,
  pressure,
  status
}) => {
  const segments = 6;
  const maxPressure = 24;
  const unitsPerSegment = maxPressure / segments;

  return (
    <div className="flex flex-col items-center p-2">
      <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100 p-5 flex flex-col items-center justify-center w-full max-w-[180px]">
        
        <h3 className="text-[10px] font-extrabold text-gray-800 uppercase tracking-wider text-center mb-3 flex items-center justify-center">
          {title}
        </h3>

        <div className="text-3xl font-bold text-[#22c55e] mb-0.5">
          {pressure.toFixed(1)} <span className="text-sm font-semibold text-gray-500 ml-0.5">bar</span>
        </div>

        <div className="w-full mt-4 mb-1.5">
          {/* 6-Segment Chunky Bar */}
          <div className="flex gap-[3px] h-3.5 w-full">
            {Array.from({ length: segments }).map((_, i) => {
              const startValue = i * unitsPerSegment;
              const endValue = (i + 1) * unitsPerSegment;
              let fillPercent = 0;
              
              if (pressure >= endValue) fillPercent = 100;
              else if (pressure > startValue) fillPercent = ((pressure - startValue) / unitsPerSegment) * 100;

              // Color mapping based on segment index
              let color = '#22c55e'; // Green for 0-12
              if (i === 3) color = '#eab308'; // Yellow for 12-16
              if (i > 3) color = '#ef4444'; // Red for 16-24

              return (
                <div key={i} className="flex-1 rounded-[3px] bg-gray-200 overflow-hidden relative shadow-inner">
                  <div 
                    className="absolute top-0 left-0 h-full transition-all duration-500"
                    style={{ width: `${fillPercent}%`, backgroundColor: color }}
                  ></div>
                </div>
              );
            })}
          </div>
          {/* Scale Labels */}
          <div className="flex justify-between w-full mt-1.5 text-[9px] font-bold text-gray-600 px-1">
            <span>0</span>
            <span>12</span>
            <span>24</span>
          </div>
        </div>

        {/* Status Pill */}
        <div className="mt-4 flex items-center justify-center w-full">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] bg-gray-50/50">
            <div className={`w-2 h-2 rounded-full shadow-sm ${status === 'NORMAL' ? 'bg-[#22c55e]' : 'bg-red-500'}`}></div>
            <span className={`text-[9px] font-bold tracking-wide ${status === 'NORMAL' ? 'text-[#16a34a]' : 'text-red-600'}`}>
              {status}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
