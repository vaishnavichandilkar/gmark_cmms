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
    <div className="flex flex-row justify-between items-start gap-2 mb-4 md:mb-6">
      <h2 className="text-base sm:text-base md:text-lg lg:text-xl font-bold text-gray-800 uppercase max-w-[65%] leading-tight tracking-wide">
        {name}
      </h2>
      
      <div className="flex flex-col items-end gap-1.5 md:gap-3">
        <StatusBadge status={status} />
        
        <div className="flex items-center gap-1">
          <span className={`text-[10px] sm:text-xs md:text-sm font-semibold ${isHealthy ? 'text-green-600' : 'text-red-500'}`}>
            Faults: {faults}
          </span>
          {isHealthy ? (
            <ShieldCheck className="text-green-600 w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          ) : (
            <ShieldAlert className="text-red-500 animate-pulse w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          )}
        </div>
      </div>
    </div>
  );
};
