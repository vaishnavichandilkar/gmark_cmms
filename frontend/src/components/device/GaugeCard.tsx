import React from 'react';

interface GaugeCardProps {
  value: number;
  min?: number;
  max?: number;
  label: string;
  unit: string;
}

export const GaugeCard: React.FC<GaugeCardProps> = ({ value, min = 0, max = 0.5, label, unit }) => {
  // SVG viewBox size
  const size = 300;
  const strokeWidth = 24;
  const radius = (size - strokeWidth * 2) / 2;
  const cx = size / 2;
  const cy = size * 0.75; // Move center down since it's a semi-circle

  // Clamp value
  const clampedValue = Math.min(Math.max(value, min), max);
  const percentage = (clampedValue - min) / (max - min);
  
  // Angle for the needle (-90 to +90 degrees mapped to SVG rotation)
  const needleAngle = -90 + (percentage * 180);

  // SVG arc path for a semi-circle
  const createArc = (startPercent: number, endPercent: number) => {
    const startAngle = Math.PI + (startPercent * Math.PI);
    const endAngle = Math.PI + (endPercent * Math.PI);
    
    const startX = cx + radius * Math.cos(startAngle);
    const startY = cy + radius * Math.sin(startAngle);
    const endX = cx + radius * Math.cos(endAngle);
    const endY = cy + radius * Math.sin(endAngle);

    return `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex flex-col items-center col-span-1 md:col-span-1 row-span-2">
      <h3 className="text-gray-600 font-medium mb-4">{label}</h3>
      
      <div className="relative w-full max-w-[250px] aspect-[4/3] flex items-center justify-center">
        <svg viewBox={`0 0 ${size} ${size * 0.85}`} className="w-full h-full drop-shadow-sm">
          {/* Green Zone (0% - 60%) */}
          <path d={createArc(0, 0.6)} fill="none" stroke="#22c55e" strokeWidth={strokeWidth} strokeLinecap="butt" />
          
          {/* Yellow Zone (60% - 80%) */}
          <path d={createArc(0.6, 0.8)} fill="none" stroke="#eab308" strokeWidth={strokeWidth} strokeLinecap="butt" />
          
          {/* Red Zone (80% - 100%) */}
          <path d={createArc(0.8, 1.0)} fill="none" stroke="#ef4444" strokeWidth={strokeWidth} strokeLinecap="butt" />

          {/* Tick marks and labels */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((tickPercent) => {
            const tickAngle = Math.PI + (tickPercent * Math.PI);
            const innerRadius = radius - strokeWidth/2 - 5;
            const outerRadius = radius + strokeWidth/2 + 5;
            
            const x1 = cx + innerRadius * Math.cos(tickAngle);
            const y1 = cy + innerRadius * Math.sin(tickAngle);
            const x2 = cx + outerRadius * Math.cos(tickAngle);
            const y2 = cy + outerRadius * Math.sin(tickAngle);
            
            // Label pos
            const labelRadius = radius + strokeWidth + 15;
            const lx = cx + labelRadius * Math.cos(tickAngle);
            const ly = cy + labelRadius * Math.sin(tickAngle);
            const tickVal = min + (tickPercent * (max - min));

            return (
              <g key={tickPercent}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cbd5e1" strokeWidth="2" />
                <text x={lx} y={ly} textAnchor="middle" alignmentBaseline="middle" fill="#64748b" fontSize="14" fontWeight="500">
                  {tickVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Needle Base */}
          <circle cx={cx} cy={cy} r="10" fill="#334155" />
          
          {/* Needle */}
          <g transform={`rotate(${needleAngle}, ${cx}, ${cy})`} className="transition-transform duration-1000 ease-out">
            <path d={`M ${cx - 4} ${cy} L ${cx} ${cy - radius + 15} L ${cx + 4} ${cy} Z`} fill="#334155" />
            {/* Needle center dot */}
            <circle cx={cx} cy={cy} r="4" fill="#cbd5e1" />
          </g>
        </svg>

        {/* Value Display */}
        <div className="absolute bottom-0 flex flex-col items-center transform translate-y-1/4">
          <span className="text-5xl font-bold text-gray-800 tracking-tight">
            {value.toFixed(2)}
          </span>
          <span className="text-gray-500 font-medium">{unit}</span>
        </div>
      </div>
    </div>
  );
};
