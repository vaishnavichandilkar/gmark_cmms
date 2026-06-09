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
}

export const PumpUnit: React.FC<PumpUnitProps> = ({ name, status, currentR, currentY, currentB, mode, runOnTime }) => {
  const isRunning = status === 'RUNNING';
  const isFault = status === 'FAULT';

  const borderColor = isFault ? 'border-red-500' : isRunning ? 'border-green-500' : 'border-gray-500';
  const glowClass = isFault ? 'shadow-[0_0_20px_rgba(239,68,68,0.3)]' : isRunning ? 'shadow-[0_0_20px_rgba(34,197,94,0.15)]' : '';


  return (
    <div className="flex flex-col items-center w-[260px]">
      <div className={`relative bg-[#0A2D5F] rounded-[20px] p-5 border-2 ${borderColor} ${glowClass} w-full flex flex-col items-center transition-all duration-300`}>
        <h3 className="absolute top-4 right-5 text-gray-300 font-bold text-base tracking-widest uppercase">{name}</h3>
        {isFault && (
          <motion.div 
            className="absolute inset-0 rounded-[20px] bg-red-500/10 z-0 pointer-events-none"
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}

        {/* Pump Illustration */}
        <div className="w-full flex justify-center items-center relative mb-4 mt-2 z-10">
          <div className="relative w-40 h-28">
            <svg viewBox="0 0 200 150" className="w-full h-full drop-shadow-xl">
              <defs>
                <linearGradient id={`motorGrad-${name.replace(/\\s/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="50%" stopColor="#94a3b8" />
                  <stop offset="100%" stopColor="#334155" />
                </linearGradient>
                <linearGradient id={`pumpGrad-${name.replace(/\\s/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
              </defs>

              {/* Base Mount */}
              <rect x="25" y="125" width="150" height="12" fill="#0f172a" rx="2" />
              <rect x="40" y="115" width="120" height="10" fill="#1e293b" />
              
              {/* Motor Cylinder */}
              <rect x="95" y="40" width="85" height="70" fill={`url(#motorGrad-${name.replace(/\\s/g, '')})`} rx="4" />
              
              {/* Motor Ribs */}
              {[...Array(9)].map((_, i) => (
                <rect key={i} x={105 + i*8} y="38" width="2" height="74" fill="#1e293b" />
              ))}
              
              {/* Motor End Cap */}
              <path d="M180,45 C195,45 195,105 180,105 Z" fill="#334155" />
              
              {/* Pump Body (Volute) */}
              <circle cx="60" cy="75" r="38" fill={`url(#pumpGrad-${name.replace(/\\s/g, '')})`} />
              <circle cx="60" cy="75" r="26" fill="#0f172a" />
              
              {/* Flanges */}
              {/* Discharge Flange (Top) */}
              <rect x="45" y="10" width="30" height="30" fill={`url(#pumpGrad-${name.replace(/\\s/g, '')})`} />
              <rect x="40" y="5" width="40" height="8" fill="#475569" rx="2" />
              
              {/* Suction Flange (Front/Left) */}
              <rect x="10" y="60" width="20" height="30" fill={`url(#pumpGrad-${name.replace(/\\s/g, '')})`} />
              <rect x="5" y="50" width="8" height="50" fill="#475569" rx="2" />
              
              {/* Shaft */}
              <rect x="85" y="70" width="15" height="10" fill="#cbd5e1" />

              {/* Flow Path Animation */}
              {isRunning && (
                <motion.path 
                  d="M15,75 L60,75 L60,15"
                  fill="none"
                  stroke="#00E5FF"
                  strokeWidth="4"
                  strokeDasharray="8 8"
                  animate={{ strokeDashoffset: [16, 0] }}
                  transition={{ duration: 0.4, repeat: Infinity, ease: "linear" }}
                />
              )}

              {/* Spinning Impeller */}
              {isRunning && <circle cx="60" cy="75" r="24" fill="#00E5FF" opacity="0.15" className="animate-pulse" />}
              <motion.g 
                style={{ transformOrigin: "60px 75px" }}
                animate={isRunning ? { rotate: [0, 360] } : { rotate: 0 }}
                transition={isRunning ? { duration: 0.2, repeat: Infinity, ease: "linear" } : { duration: 0 }}
              >
                <circle cx="60" cy="75" r="22" fill="#1e293b" />
                {[...Array(6)].map((_, i) => (
                  <g key={i} style={{ transformOrigin: "60px 75px", transform: `rotate(${i * 60}deg)` }}>
                    <rect x="58" y="53" width="4" height="22" fill={isRunning ? "#00E5FF" : "#475569"} rx="1" />
                  </g>
                ))}
                <circle cx="60" cy="75" r="8" fill="#0f172a" />
                <circle cx="60" cy="75" r="3" fill={isRunning ? "#fff" : "#475569"} />
              </motion.g>

              {/* Status LED */}
              <circle cx="170" cy="75" r="5" fill={isFault ? "#ef4444" : isRunning ? "#22c55e" : "#64748b"} className={isRunning || isFault ? 'animate-pulse' : ''} />
            </svg>
          </div>
        </div>

        {/* Mode Buttons */}
        <div className="flex bg-[#051124] rounded-lg border border-[rgba(255,255,255,0.05)] p-1 mb-4 mt-1 w-[90%] justify-center z-10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] gap-1">
          <button className={`flex-1 py-1.5 text-[10px] font-bold tracking-widest rounded transition-all duration-300 ${mode === 'AUTO' ? 'bg-[#0A2D5F] text-blue-400 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'text-gray-500 border border-transparent hover:text-gray-300 hover:bg-white/5'}`}>AUTO</button>
          <button className={`flex-1 py-1.5 text-[10px] font-bold tracking-widest rounded transition-all duration-300 ${mode === 'OFF' ? 'bg-[#0A2D5F] text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'text-gray-500 border border-transparent hover:text-gray-300 hover:bg-white/5'}`}>OFF</button>
          <button className={`flex-1 py-1.5 text-[10px] font-bold tracking-widest rounded transition-all duration-300 ${mode === 'MANUAL' ? 'bg-[#0A2D5F] text-gray-200 border border-gray-500/50 shadow-[0_0_15px_rgba(156,163,175,0.2)]' : 'text-gray-500 border border-transparent hover:text-gray-300 hover:bg-white/5'}`}>MANUAL</button>
        </div>

        {/* Right Info -> Now Bottom Info */}
        <div className="w-full flex flex-col gap-3 px-2 z-10">
          <div className="flex justify-between items-center text-base text-gray-300 border-b border-[rgba(255,255,255,0.05)] pb-2">
            <div className="flex items-center gap-2"><Clock size={12} /> <span className="uppercase text-base tracking-widest">Time</span></div>
            <span className="font-mono font-bold text-white text-lg">0:0 Hrs</span>
          </div>
          
          <div className="flex justify-between items-center text-base text-gray-300 border-b border-[rgba(255,255,255,0.05)] pb-2">
            <div className="flex items-center gap-2"><Zap size={12} /> <span className="uppercase text-base tracking-widest">Run On</span></div>
            <span className="font-bold text-white text-lg">{runOnTime}</span>
          </div>

          <div className="mt-2 mb-1">
            <div className="text-base text-gray-400 uppercase tracking-widest mb-1.5 text-center">Current (Amp)</div>
            <div className="flex justify-center gap-6 px-2 text-lg font-mono font-bold">
              <div className="flex flex-col items-center"><span className="text-red-500 text-base">R</span><span className="text-white mt-0.5">{currentR}</span></div>
              <div className="flex flex-col items-center"><span className="text-yellow-500 text-base">Y</span><span className="text-white mt-0.5">{currentY}</span></div>
              <div className="flex flex-col items-center"><span className="text-blue-500 text-base">B</span><span className="text-white mt-0.5">{currentB}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
