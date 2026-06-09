import React from 'react';
import { RefreshCw } from 'lucide-react';

interface DeviceFooterProps {
  timestamp: string;
}

export const DeviceFooter: React.FC<DeviceFooterProps> = ({ timestamp }) => {
  const formatTimestamp = (ts: string | number) => {
    if (!ts) return 'N/A';
    const parsed = typeof ts === 'string' && /^\d+$/.test(ts) ? parseInt(ts, 10) : ts;
    const date = new Date(parsed);
    if (isNaN(date.getTime())) return String(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex items-center justify-between text-[10px] sm:text-xs font-semibold text-gray-400">
      <div className="flex items-center gap-2 min-w-0">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </div>
        <div className="flex items-center gap-1.5">
          <RefreshCw size={11} className="text-gray-400 animate-[spin_10s_linear_infinite]" />
          <span className="truncate uppercase tracking-wider text-[9px] sm:text-[10px]">Live Auto-refresh</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 text-gray-400">
        <span className="uppercase tracking-wider text-[9px] sm:text-[10px]">Updated:</span>
        <span className="font-extrabold text-white bg-white/10 px-2 py-0.5 rounded text-[9px] sm:text-[10px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.03)]">{formatTimestamp(timestamp)}</span>
      </div>
    </div>
  );
};
