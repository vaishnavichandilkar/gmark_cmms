import React from 'react';
import type { DeviceStatus } from '../../types';

interface StatusBadgeProps {
  status: DeviceStatus;
}

const GlowingDot = ({ colorClass }: { colorClass: string }) => (
  <div className="relative flex items-center justify-center w-4 h-4 mr-0.5">
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes customRipple {
        0% {
          transform: scale(0.5);
          opacity: 0.9;
        }
        100% {
          transform: scale(4.0);
          opacity: 0;
        }
      }
    `}} />
    <span 
      className={`absolute inline-flex h-2.5 w-2.5 rounded-full ${colorClass}`} 
      style={{ animation: 'customRipple 2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite' }}
    />
    <span 
      className={`relative inline-flex rounded-full h-1.5 w-1.5 ${colorClass}`} 
      style={{ 
        boxShadow: '0 0 10px #10b981, 0 0 3px #10b981',
        backgroundColor: '#34d399'
      }} 
    />
  </div>
);

const RadarPulse = ({ colorClass, glowColor }: { colorClass: string, glowColor: string }) => (
  <div className="relative flex items-center justify-center w-3 h-3 mr-0.5">
    <span className={`animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] absolute inline-flex h-full w-full rounded-full opacity-60 ${colorClass}`} />
    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${colorClass} ${glowColor}`} />
  </div>
);

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'ONLINE':
      case 'RUNNING':
        return { 
          text: 'text-emerald-500 font-bold', 
          style: {},
          dotBg: 'bg-emerald-400', 
          dotGlow: '',
          badgeText: 'ONLINE'
        };
      case 'OFFLINE':
      case 'FAULT':
        return { 
          text: 'text-rose-500 drop-shadow-[0_0_3px_rgba(244,63,94,0.4)]', 
          style: {},
          dotBg: 'bg-rose-500', 
          dotGlow: 'shadow-[0_0_8px_rgba(244,63,94,0.8)]',
          badgeText: status
        };
      case 'WARNING':
        return { 
          text: 'text-amber-500 drop-shadow-[0_0_3px_rgba(245,158,11,0.4)]', 
          style: {},
          dotBg: 'bg-amber-500', 
          dotGlow: 'shadow-[0_0_8px_rgba(245,158,11,0.8)]',
          badgeText: status
        };
      default:
        return { 
          text: 'text-slate-500', 
          style: {},
          dotBg: 'bg-slate-400', 
          dotGlow: 'shadow-sm',
          badgeText: status
        };
    }
  };

  const config = getStatusConfig();
  const isOnline = status === 'ONLINE' || status === 'RUNNING';

  return (
    <div className="flex items-center gap-1.5 select-none py-1">
      {isOnline ? (
        <GlowingDot colorClass={config.dotBg} />
      ) : (
        <RadarPulse colorClass={config.dotBg} glowColor={config.dotGlow} />
      )}
      <span 
        className={`text-[11px] font-semibold tracking-widest uppercase ${config.text}`}
        style={config.style}
      >
        {config.badgeText}
      </span>
    </div>
  );
};
