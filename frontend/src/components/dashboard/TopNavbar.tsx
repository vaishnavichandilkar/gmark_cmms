import React from 'react';
import { Activity, Radio, Clock } from 'lucide-react';
import { useMqttStore } from '../../store/useMqttStore';

export const TopNavbar: React.FC = () => {
  const { isConnected, lastUpdated, topic } = useMqttStore();

  const formattedTime = lastUpdated 
    ? new Date(lastUpdated).toLocaleTimeString() 
    : 'Waiting for data...';

  return (
    <nav className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white leading-tight">SCADA<span className="text-emerald-400">View</span></h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Industrial IoT Platform</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">
          <Radio className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-mono text-slate-300">{topic}</span>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-300">{formattedTime}</span>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
          <div className="relative flex h-2.5 w-2.5">
            {isConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
          </div>
          <span className="text-xs font-medium text-slate-300">
            {isConnected ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>
    </nav>
  );
};
