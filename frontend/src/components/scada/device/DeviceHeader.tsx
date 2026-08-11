import React from 'react';
import { StatusBadge } from '../../shared/StatusBadge';
import type { DeviceStatus } from '../../../types';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

interface DeviceHeaderProps {
  name: string;
  status: DeviceStatus;
  faults: number;
}

export const DeviceHeader: React.FC<DeviceHeaderProps> = ({ name, status, faults }) => {
  const isHealthy = faults === 0;

  const formatName = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getMappedStatus = (): 'healthy' | 'warning' | 'critical' => {
    if (status === 'WARNING') return 'warning';
    if (status === 'FAULT' || status === 'OFFLINE') return 'critical';
    return 'healthy';
  };

  return (
    <div className="flex flex-row justify-between items-center gap-3">
      <h2 className="text-base sm:text-lg md:text-xl font-black text-gray-900 max-w-[65%] leading-tight tracking-wide">
        {formatName(name)}
      </h2>
      
      <div className="flex flex-col items-end gap-1 sm:gap-1.5">
        <StatusBadge status={getMappedStatus()} />
        
        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-full border border-gray-200 shadow-sm">
          <span className={`text-[9px] sm:text-[11px] font-bold ${isHealthy ? 'text-emerald-600' : 'text-rose-600'}`}>
            Faults: {faults}
          </span>
          {isHealthy ? (
            <ShieldCheck className="text-emerald-500 w-3.5 h-3.5" />
          ) : (
            <ShieldAlert className="text-rose-500 animate-pulse w-3.5 h-3.5" />
          )}
        </div>
      </div>
    </div>
  );
};
