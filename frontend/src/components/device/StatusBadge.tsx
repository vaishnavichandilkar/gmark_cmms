import React from 'react';
import type { DeviceStatus } from '../../types';

interface StatusBadgeProps {
  status: DeviceStatus;
}

const FrequencyAnimation = () => (
  <div className="flex items-center gap-[3.5px] h-3 px-0.5">
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes eqBar1 {
        0%, 100% { height: 4px; }
        50% { height: 12px; }
      }
      @keyframes eqBar2 {
        0%, 100% { height: 7px; }
        50% { height: 11px; }
      }
      @keyframes eqBar3 {
        0%, 100% { height: 3px; }
        50% { height: 14px; }
      }
    `}} />
    <div className="w-[3px] bg-green-500 rounded-full" style={{ animation: 'eqBar1 0.8s ease-in-out infinite' }} />
    <div className="w-[3px] bg-green-500 rounded-full" style={{ animation: 'eqBar2 0.6s ease-in-out infinite' }} />
    <div className="w-[3px] bg-green-500 rounded-full" style={{ animation: 'eqBar3 1.0s ease-in-out infinite' }} />
  </div>
);

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'ONLINE':
      case 'RUNNING':
        return { color: 'text-green-500', bg: 'bg-green-500', border: 'border-green-500/30' };
      case 'OFFLINE':
      case 'FAULT':
        return { color: 'text-red-500', bg: 'bg-red-500', border: 'border-red-500/30' };
      case 'WARNING':
        return { color: 'text-orange-500', bg: 'bg-orange-500', border: 'border-orange-500/30' };
      default:
        return { color: 'text-gray-500', bg: 'bg-gray-500', border: 'border-gray-500/30' };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-gray-150 bg-white shadow-sm">
      {status === 'ONLINE' || status === 'RUNNING' ? (
        <FrequencyAnimation />
      ) : (
        <div className={`w-2 h-2 rounded-full ${config.bg} animate-pulse`} />
      )}
      <span className={`text-sm font-semibold tracking-wide ${config.color}`}>
        {status}
      </span>
    </div>
  );
};
