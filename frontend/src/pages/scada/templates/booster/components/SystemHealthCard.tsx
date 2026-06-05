import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface SystemHealthCardProps {
  faults: number;
}

export const SystemHealthCard: React.FC<SystemHealthCardProps> = ({ faults }) => {
  const isHealthy = faults === 0;

  return (
    <div className={`bg-[#0A2D5F] rounded-[20px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)] border mb-4 flex justify-between items-center transition-all duration-300 ${isHealthy ? 'border-[rgba(255,255,255,0.08)]' : 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] bg-red-900/20'}`}>
      <div className="flex flex-col">
        <span className="text-white text-2xl font-bold tracking-wide">
          Faults: <span className={isHealthy ? 'text-white' : 'text-red-500 animate-pulse'}>{faults}</span>
        </span>
        <span className={`text-sm font-bold tracking-widest uppercase mt-2 ${isHealthy ? 'text-green-500' : 'text-red-500'}`}>
          {isHealthy ? 'SYSTEM HEALTHY' : 'SYSTEM FAULT'}
        </span>
      </div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isHealthy ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
        {isHealthy ? <CheckCircle2 size={32} /> : <AlertCircle size={32} className="animate-bounce" />}
      </div>
    </div>
  );
};
