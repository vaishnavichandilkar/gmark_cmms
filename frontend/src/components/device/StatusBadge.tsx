import React from 'react';
import type { DeviceStatus } from '../../types';

interface StatusBadgeProps {
  status: DeviceStatus;
}

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
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${config.border} bg-white shadow-sm`}>
      <div className={`w-2 h-2 rounded-full ${config.bg} animate-pulse`} />
      <span className={`text-sm font-semibold tracking-wide ${config.color}`}>
        {status}
      </span>
    </div>
  );
};
