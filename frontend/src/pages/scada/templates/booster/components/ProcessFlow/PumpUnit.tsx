import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Zap } from 'lucide-react';

interface PumpUnitProps {
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'RUNNING' | 'FAULT' | 'WARNING' | 'OFF';
  currentR: number;
  currentY: number;
  currentB: number;
  mode: 'AUTO' | 'MANUAL' | 'OFF';
  runOnTime: string;
  onModeChange?: (mode: 'AUTO' | 'MANUAL' | 'OFF') => void;
}

export const PumpUnit: React.FC<PumpUnitProps> = ({ name, status, currentR, currentY, currentB, mode, runOnTime, onModeChange }) => {
  const isRunning = status === 'RUNNING';
  const isFault = status === 'FAULT';

  const cardStyle = isFault
    ? 'liquid-glass-fault'
    : isRunning
      ? 'liquid-glass-active'
      : 'liquid-glass-inactive';

  return (
    <div className="flex flex-col items-center w-[260px]">
      <div
        className={`relative rounded-[24px] p-[20px] ${cardStyle} border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] w-full flex flex-col items-center transition-all duration-300`}
      >
        <h3 className="absolute top-[16px] right-[20px] text-[rgba(255,255,255,0.45)] font-bold text-[14px] tracking-widest uppercase z-10">{name}</h3>
        {isFault && (
          <motion.div
            className="absolute inset-0 rounded-[24px] bg-[#FF453A]/5 z-0 pointer-events-none"
            animate={{ opacity: [0, 0.4, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}

        {/* Pump Illustration */}
        <div className="w-full flex justify-center items-center relative mb-[16px] mt-[8px] z-10">
          <div className="relative w-[160px] h-[112px]">
            <svg viewBox="0 0 200 150" className="w-full h-full drop-shadow-xl">
              <defs>
                <linearGradient id={`motorGrad-${name.replace(/\s/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" /> {/* Slate 800 */}
                  <stop offset="100%" stopColor="#0f172a" /> {/* Slate 900 */}
                </linearGradient>
                <linearGradient id={`pumpGrad-${name.replace(/\s/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#115e59" /> {/* Teal 800 */}
                  <stop offset="100%" stopColor="#042f2e" /> {/* Teal 900 */}
                </linearGradient>
              </defs>

              {/* Base Mount */}
              <rect x="25" y="125" width="150" height="12" fill="#020617" rx="2" />
              <rect x="40" y="115" width="120" height="10" fill="#0f172a" />

              {/* Motor Cylinder */}
              <rect x="95" y="40" width="85" height="70" fill={`url(#motorGrad-${name.replace(/\s/g, '')})`} rx="4" />

              {/* Motor Ribs */}
              {[...Array(9)].map((_, i) => (
                <rect key={i} x={105 + i * 8} y="38" width="2" height="74" fill="#334155" />
              ))}

              {/* Motor End Cap */}
              <path d="M180,45 C195,45 195,105 180,105 Z" fill="#1e293b" />

              {/* Pump Body (Volute) */}
              <circle cx="60" cy="75" r="38" fill={`url(#pumpGrad-${name.replace(/\s/g, '')})`} />
              <circle cx="60" cy="75" r="26" fill="#0f172a" />

              {/* Flanges */}
              {/* Discharge Flange (Top) */}
              <rect x="45" y="10" width="30" height="30" fill={`url(#pumpGrad-${name.replace(/\s/g, '')})`} />
              <rect x="40" y="5" width="40" height="8" fill="#134e4a" rx="2" />

              {/* Suction Flange (Front/Left) */}
              <rect x="10" y="60" width="20" height="30" fill={`url(#pumpGrad-${name.replace(/\s/g, '')})`} />
              <rect x="5" y="50" width="8" height="50" fill="#134e4a" rx="2" />

              {/* Shaft */}
              <rect x="85" y="70" width="15" height="10" fill="#475569" />

              {/* Flow Path Animation */}
              {isRunning && (
                <motion.path
                  d="M15,75 L60,75 L60,15"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="4"
                  strokeDasharray="8 8"
                  animate={{ strokeDashoffset: [16, 0] }}
                  transition={{ duration: 0.4, repeat: Infinity, ease: "linear" }}
                />
              )}

              {/* Spinning Impeller */}
              {isRunning && <circle cx="60" cy="75" r="24" fill="#14b8a6" opacity="0.15" className="animate-pulse" />}
              <motion.g
                style={{ transformOrigin: "60px 75px" }}
                animate={isRunning ? { rotate: [0, 360] } : { rotate: 0 }}
                transition={isRunning ? { duration: 0.2, repeat: Infinity, ease: "linear" } : { duration: 0 }}
              >
                <circle cx="60" cy="75" r="22" fill="#020617" />
                {[...Array(6)].map((_, i) => (
                  <g key={i} style={{ transformOrigin: "60px 75px", transform: `rotate(${i * 60}deg)` }}>
                    <rect x="58" y="53" width="4" height="22" fill={isRunning ? "#14b8a6" : "#0f766e"} rx="1" />
                  </g>
                ))}
                <circle cx="60" cy="75" r="8" fill="#134e4a" />
                <circle cx="60" cy="75" r="3" fill={isRunning ? "#ccfbf1" : "#115e59"} />
              </motion.g>

              {/* Status LED */}
              <circle cx="170" cy="75" r="5" fill={isFault ? "#FF453A" : isRunning ? "#30D158" : "#8E8E93"} className={isRunning || isFault ? 'animate-pulse' : ''} />
            </svg>
          </div>
        </div>

        {/* Mode Selector - Segmented Control */}
        <div className="segmented-control mb-[16px] mt-[4px] w-[95%] justify-center z-10 relative">
          <button
            onClick={() => onModeChange?.('AUTO')}
            className={`relative flex-1 py-[6px] text-[10px] font-semibold tracking-wider segmented-item transition-colors duration-200 ${mode === 'AUTO' ? 'text-white' : ''}`}
          >
            {mode === 'AUTO' && (
              <motion.div
                layoutId={`segmented-bg-${name}`}
                className="absolute inset-0 bg-white/[0.09] rounded-full z-0"
                style={{
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 2px 6px rgba(0, 0, 0, 0.4), inset 0 0 1px rgba(255, 255, 255, 0.2)'
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">AUTO</span>
          </button>
          <button
            onClick={() => onModeChange?.('OFF')}
            className={`relative flex-1 py-[6px] text-[10px] font-semibold tracking-wider segmented-item transition-colors duration-200 ${mode === 'OFF' ? 'text-white' : ''}`}
          >
            {mode === 'OFF' && (
              <motion.div
                layoutId={`segmented-bg-${name}`}
                className="absolute inset-0 bg-white/[0.09] rounded-full z-0"
                style={{
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 2px 6px rgba(0, 0, 0, 0.4), inset 0 0 1px rgba(255, 255, 255, 0.2)'
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">OFF</span>
          </button>
          <button
            onClick={() => onModeChange?.('MANUAL')}
            className={`relative flex-1 py-[6px] text-[10px] font-semibold tracking-wider segmented-item transition-colors duration-200 ${mode === 'MANUAL' ? 'text-white' : ''}`}
          >
            {mode === 'MANUAL' && (
              <motion.div
                layoutId={`segmented-bg-${name}`}
                className="absolute inset-0 bg-white/[0.09] rounded-full z-0"
                style={{
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 2px 6px rgba(0, 0, 0, 0.4), inset 0 0 1px rgba(255, 255, 255, 0.2)'
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">MANUAL</span>
          </button>
        </div>

        {/* Right Info -> Now Bottom Info */}
        <div className="w-full flex flex-col gap-[12px] z-10 bg-black/80 backdrop-blur-md rounded-2xl p-[16px] border border-white/5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.2)]">
          <div className="flex justify-between items-center text-[16px] text-[rgba(255,255,255,0.75)] border-b border-white/[0.03] pb-[8px] font-medium">
            <div className="flex items-center gap-[8px]"><Clock size={12} className="text-[rgba(255,255,255,0.45)]" /> <span className="uppercase text-[12px] tracking-widest text-[rgba(255,255,255,0.45)] font-semibold">Time</span></div>
            <span className="font-mono font-semibold text-white text-[16px]">{runOnTime}</span>
          </div>

          <div className="flex justify-between items-center text-[16px] text-[rgba(255,255,255,0.75)] border-b border-white/[0.03] pb-[8px] font-medium">
            <div className="flex items-center gap-[8px]"><Zap size={12} className="text-[rgba(255,255,255,0.45)]" /> <span className="uppercase text-[12px] tracking-widest text-[rgba(255,255,255,0.45)] font-semibold">Run On</span></div>
            <span className="font-semibold text-white text-[16px]">{runOnTime}</span>
          </div>

          <div className="mt-[4px]">
            <div className="text-[10px] text-[rgba(255,255,255,0.45)] uppercase tracking-widest mb-[8px] text-center font-bold">Current (Amp)</div>
            <div className="flex justify-around w-full px-[8px] text-[14px] font-mono font-bold bg-black/30 rounded-xl py-[8px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]">
              <div className="flex flex-col items-center"><span className="text-[#FF453A] text-[10px] font-bold mb-[2px]">R</span><span className="text-white">{currentR}</span></div>
              <div className="flex flex-col items-center"><span className="text-[#FFD60A] text-[10px] font-bold mb-[2px]">Y</span><span className="text-white">{currentY}</span></div>
              <div className="flex flex-col items-center"><span className="text-[#0A84FF] text-[10px] font-bold mb-[2px]">B</span><span className="text-white">{currentB}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
