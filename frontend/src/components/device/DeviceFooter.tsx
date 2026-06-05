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
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-[11px] font-medium text-gray-400">
      <div className="flex items-center gap-1.5 min-w-0">
        <RefreshCw size={12} className="text-blue-500 animate-[spin_8s_linear_infinite]" />
        <span className="truncate">Auto-refreshing (5s)</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span>Updated:</span>
        <span className="font-bold text-gray-600">{formatTimestamp(timestamp)}</span>
      </div>
    </div>
  );
};
