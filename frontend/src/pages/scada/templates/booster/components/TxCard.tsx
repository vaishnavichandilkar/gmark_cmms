import React from 'react';
import { Radio } from 'lucide-react';

interface TxCardProps {
  isConnected?: boolean;
}

export const TxCard: React.FC<TxCardProps> = ({ isConnected = false }) => {
  return (
    <div className="scada-card flex flex-col justify-between">
      <div className="scada-card-title">
        <Radio size={16} className="text-gray-400" />
        <h2>TX</h2>
      </div>

      <div className="flex flex-col items-center flex-1 justify-center py-1">
        <div className="relative flex items-center justify-center w-8 h-8 mb-2">
          {isConnected && (
            <>
              <div className="absolute w-full h-full border border-[#22c55e]/30 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-30"></div>
              <div className="absolute w-6 h-6 border border-[#22c55e]/40 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s] opacity-45"></div>
            </>
          )}
          <Radio size={18} className={`${isConnected ? 'text-[#22c55e]' : 'text-gray-400'} relative z-10`} />
        </div>
        <div className="flex items-center gap-2">
          <span className={`${isConnected ? 'text-[#22c55e]' : 'text-gray-400'} text-sm font-bold tracking-widest uppercase`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <div className={`w-2 h-2 ${isConnected ? 'bg-[#22c55e]' : 'bg-gray-400'} rounded-full`}></div>
        </div>
      </div>
    </div>
  );
};
