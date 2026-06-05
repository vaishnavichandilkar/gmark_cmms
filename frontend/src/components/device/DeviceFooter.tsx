import React from 'react';
import { RefreshCw } from 'lucide-react';

interface DeviceFooterProps {
  timestamp: string;
}

export const DeviceFooter: React.FC<DeviceFooterProps> = ({ timestamp }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-4 pt-4 border-t border-gray-100 text-sm text-textMuted">
      <div className="flex items-center gap-2">
        <RefreshCw size={16} className="text-blue-400" />
        <span>Auto-refreshing every 5 sec</span>
      </div>
      <div className="flex items-center gap-1">
        <span>Last Updated:</span>
        <span className="font-medium text-textMain">{timestamp || 'N/A'}</span>
      </div>
    </div>
  );
};
