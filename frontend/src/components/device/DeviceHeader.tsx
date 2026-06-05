import React from 'react';
import { StatusBadge } from './StatusBadge';
import type { DeviceStatus } from '../../types';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

interface DeviceHeaderProps {
  name: string;
  status: DeviceStatus;
  faults: number;
}

export const DeviceHeader: React.FC<DeviceHeaderProps> = ({ name, status, faults }) => {
  const isHealthy = faults === 0;

  return (
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
      <h2 className="text-xl md:text-2xl font-bold text-gray-800 uppercase max-w-[70%] leading-tight tracking-wide">
        {name}
      </h2>
      
      <div className="flex flex-col items-end gap-3">
        <StatusBadge status={status} />
        
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-semibold ${isHealthy ? 'text-green-600' : 'text-red-500'}`}>
            Faults: {faults}
          </span>
          {isHealthy ? (
            <ShieldCheck className="text-green-600" size={20} />
          ) : (
            <ShieldAlert className="text-red-500 animate-pulse" size={20} />
          )}
        </div>
      </div>
    </div>
  );
};
