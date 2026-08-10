import React from 'react';
import { Activity } from 'lucide-react';

interface PressureTrendCardProps {
  data?: any[]; // Placeholder for actual chart data
}

export const PressureTrendCard: React.FC<PressureTrendCardProps> = () => {
  return (
    <div className="scada-card flex flex-col h-full relative overflow-hidden group">
      <div className="flex justify-between items-center mb-4">
        <div className="scada-card-title !mb-0">
          <Activity size={16} className="text-gray-400" />
          <h2>PRESSURE TREND</h2>
        </div>
        
        <select className="text-xs bg-gray-50 border border-gray-200 text-gray-700 rounded px-2 py-1 outline-none">
          <option>Last 24 Hours</option>
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
        </select>
      </div>

      <div className="flex gap-4 text-[10px] font-semibold uppercase tracking-wider mb-2">
        <div className="flex items-center gap-1">
          <span className="w-4 border-b-2 border-dashed border-[#eab308]"></span>
          <span className="text-gray-500">SET POINT <span className="text-[#eab308] font-bold">(2.5 BAR)</span></span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-4 border-b-2 border-dashed border-[#22c55e]"></span>
          <span className="text-gray-500">PUMP ON <span className="text-[#22c55e] font-bold">(2.0 BAR)</span></span>
        </div>
      </div>

      <div className="flex-1 w-full relative mt-2 min-h-[120px]">
        {/* Placeholder SVG Chart for Light Theme */}
        <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id="trendGradientLight" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0"/>
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1="20" x2="400" y2="20" stroke="#f3f4f6" strokeWidth="1" />
          <line x1="0" y1="60" x2="400" y2="60" stroke="#f3f4f6" strokeWidth="1" />
          <line x1="0" y1="100" x2="400" y2="100" stroke="#f3f4f6" strokeWidth="1" />

          {/* Reference lines */}
          <line x1="0" y1="40" x2="400" y2="40" stroke="#eab308" strokeWidth="1.5" strokeDasharray="4 4" />
          <line x1="0" y1="80" x2="400" y2="80" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 4" />

          {/* Trend line and area */}
          <path d="M0,100 L0,90 C40,80 60,60 100,50 C140,40 160,85 200,60 C240,35 260,25 300,45 C340,65 360,50 400,30 L400,100 Z" fill="url(#trendGradientLight)" />
          <path d="M0,90 C40,80 60,60 100,50 C140,40 160,85 200,60 C240,35 260,25 300,45 C340,65 360,50 400,30" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
        </svg>

        {/* X-axis labels */}
        <div className="absolute bottom-0 w-full flex justify-between text-[9px] text-gray-400 px-1 font-mono">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
      </div>
    </div>
  );
};
