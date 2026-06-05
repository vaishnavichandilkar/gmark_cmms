import React from 'react';
import { Zap, Activity, Waves } from 'lucide-react';

export const PerformanceCard: React.FC = () => {
  return (
    <div className="bg-[#0A2D5F] rounded-[20px] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)] border border-[rgba(255,255,255,0.08)] mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={18} color="#00E5FF" />
        <h2 className="text-[#00E5FF] font-bold text-sm tracking-widest uppercase">Performance</h2>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Voltage */}
        <div className="flex flex-col border-r border-[rgba(255,255,255,0.08)] pr-4">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold mb-2 tracking-wider">
            <Zap size={12} /> VOLTAGE
          </div>
          <div className="text-2xl font-bold text-white mb-2">415 <span className="text-sm font-normal text-gray-400">V</span></div>
          <div className="flex gap-2 text-[10px] font-mono">
            <div className="flex flex-col items-center"><span className="text-red-500 font-bold">R</span><span className="text-white">418</span></div>
            <div className="flex flex-col items-center"><span className="text-yellow-500 font-bold">Y</span><span className="text-white">415</span></div>
            <div className="flex flex-col items-center"><span className="text-blue-500 font-bold">B</span><span className="text-white">414</span></div>
          </div>
        </div>

        {/* Input Power */}
        <div className="flex flex-col items-center border-r border-[rgba(255,255,255,0.08)] px-2">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold mb-3 tracking-wider">
            <Activity size={12} /> INPUT POWER
          </div>
          <div className="mt-2 px-3 py-1 border border-green-500 text-green-500 text-xs font-bold tracking-widest rounded uppercase">
            POWER OK
          </div>
        </div>

        {/* Current */}
        <div className="flex flex-col pl-2">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold mb-2 tracking-wider">
            <Waves size={12} /> CURRENT
          </div>
          <div className="text-3xl font-bold text-white mt-1">0.0 <span className="text-sm font-normal text-gray-400">A</span></div>
        </div>
      </div>
    </div>
  );
};
