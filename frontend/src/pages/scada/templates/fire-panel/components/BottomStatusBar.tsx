import React from 'react';
import { ShieldCheck, AlertTriangle, Activity, Droplets, Wifi } from 'lucide-react';

interface BottomStatusBarProps {
  faults: number;
  runningPumps: number;
  totalPumps: number;
  waterLevel: number;
}

export const BottomStatusBar: React.FC<BottomStatusBarProps> = ({ faults, runningPumps, totalPumps, waterLevel }) => {
  const isHealthy = faults === 0;

  return (
    <div className="flex flex-wrap justify-between gap-4 mt-6">
      <div className="flex-1 bg-[#0A2D5F] rounded-[20px] p-4 flex items-center gap-4 border border-[rgba(255,255,255,0.08)] shadow-[0_10px_30px_rgba(0,0,0,0.25)] min-w-[200px]">
        <div className={`p-3 rounded-full ${isHealthy ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
          <ShieldCheck size={24} />
        </div>
        <div className="flex flex-col">
          <span className="text-gray-400 text-xs font-semibold tracking-widest uppercase">System Status</span>
          <span className={`font-bold text-lg ${isHealthy ? 'text-green-500' : 'text-red-500'}`}>{isHealthy ? 'Healthy' : 'Fault'}</span>
        </div>
      </div>

      <div className="flex-1 bg-[#0A2D5F] rounded-[20px] p-4 flex items-center gap-4 border border-[rgba(255,255,255,0.08)] shadow-[0_10px_30px_rgba(0,0,0,0.25)] min-w-[200px]">
        <div className={`p-3 rounded-full ${faults > 0 ? 'bg-red-500/20 text-red-500' : 'bg-gray-500/20 text-gray-400'}`}>
          <AlertTriangle size={24} />
        </div>
        <div className="flex flex-col">
          <span className="text-gray-400 text-xs font-semibold tracking-widest uppercase">Active Faults</span>
          <span className={`font-bold text-lg ${faults > 0 ? 'text-red-500' : 'text-white'}`}>{faults}</span>
        </div>
      </div>

      <div className="flex-1 bg-[#0A2D5F] rounded-[20px] p-4 flex items-center gap-4 border border-[rgba(255,255,255,0.08)] shadow-[0_10px_30px_rgba(0,0,0,0.25)] min-w-[200px]">
        <div className="p-3 rounded-full bg-blue-500/20 text-blue-500">
          <Activity size={24} />
        </div>
        <div className="flex flex-col">
          <span className="text-gray-400 text-xs font-semibold tracking-widest uppercase">Running Pumps</span>
          <span className="font-bold text-lg text-white font-mono">{runningPumps} / {totalPumps}</span>
        </div>
      </div>

      <div className="flex-1 bg-[#0A2D5F] rounded-[20px] p-4 flex items-center gap-4 border border-[rgba(255,255,255,0.08)] shadow-[0_10px_30px_rgba(0,0,0,0.25)] min-w-[200px]">
        <div className="p-3 rounded-full bg-cyan-500/20 text-cyan-500">
          <Droplets size={24} />
        </div>
        <div className="flex flex-col">
          <span className="text-gray-400 text-xs font-semibold tracking-widest uppercase">Water Level</span>
          <span className="font-bold text-lg text-white font-mono">{waterLevel > 0 ? `${waterLevel}%` : 'N/A'}</span>
        </div>
      </div>

      <div className="flex-1 bg-[#0A2D5F] rounded-[20px] p-4 flex items-center gap-4 border border-[rgba(255,255,255,0.08)] shadow-[0_10px_30px_rgba(0,0,0,0.25)] min-w-[200px]">
        <div className="p-3 rounded-full bg-green-500/20 text-green-500 relative">
          <div className="absolute inset-0 rounded-full border-2 border-green-500 animate-ping opacity-20"></div>
          <Wifi size={24} />
        </div>
        <div className="flex flex-col">
          <span className="text-gray-400 text-xs font-semibold tracking-widest uppercase">Communication</span>
          <span className="font-bold text-lg text-green-500">Connected</span>
        </div>
      </div>
    </div>
  );
};
