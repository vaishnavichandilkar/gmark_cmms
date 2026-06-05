import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Zap } from 'lucide-react';

interface PumpUnitProps {
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'RUNNING' | 'FAULT' | 'WARNING';
  currentR: number;
  currentY: number;
  currentB: number;
  mode: 'AUTO' | 'MANUAL' | 'OFF';
  runOnTime: string;
}

export const PumpUnit: React.FC<PumpUnitProps> = ({ name, status, currentR, currentY, currentB, mode, runOnTime }) => {
  const isRunning = status === 'RUNNING' || status === 'ONLINE'; // Assuming online also means running or ready
  const isFault = status === 'FAULT';

  const borderColor = isFault ? 'border-red-500' : isRunning ? 'border-green-500' : 'border-gray-500';
  const glowClass = isFault ? 'shadow-[0_0_20px_rgba(239,68,68,0.3)]' : isRunning ? 'shadow-[0_0_20px_rgba(34,197,94,0.15)]' : '';
  const statusText = isFault ? 'FAULT' : isRunning ? 'RUNNING' : 'OFF';
  const statusColor = isFault ? 'text-red-500' : isRunning ? 'text-green-500' : 'text-gray-500';

  return (
    <div className={`relative bg-[#0A2D5F] rounded-[20px] p-5 border-2 ${borderColor} ${glowClass} w-[340px] flex flex-col transition-all duration-300`}>
      {isFault && (
        <motion.div 
          className="absolute inset-0 rounded-[20px] bg-red-500/10 z-0 pointer-events-none"
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}

      <div className="flex justify-between items-start mb-4 z-10">
        <h3 className="text-white font-bold text-lg tracking-wide uppercase">{name}</h3>
        <div className="flex bg-[#021B3A] rounded border border-[rgba(255,255,255,0.08)] overflow-hidden">
          <button className={`px-3 py-1 text-xs font-bold ${mode === 'AUTO' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-[#072B58]'}`}>AUTO</button>
          <button className={`px-3 py-1 text-xs font-bold ${mode === 'OFF' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-[#072B58]'}`}>OFF</button>
          <button className={`px-3 py-1 text-xs font-bold ${mode === 'MANUAL' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:bg-[#072B58]'}`}>MANUAL</button>
        </div>
      </div>

      <div className="flex z-10 gap-4">
        {/* Pump Illustration */}
        <div className="w-1/2 flex justify-center items-center relative">
          {/* Detailed SVG Pump */}
          <div className="relative w-32 h-24">
            <svg viewBox="0 0 200 150" className="w-full h-full drop-shadow-xl">
              {/* Base */}
              <rect x="20" y="130" width="160" height="10" fill="#334155" rx="2" />
              <rect x="30" y="120" width="140" height="10" fill="#475569" />
              
              {/* Motor body */}
              <rect x="90" y="40" width="90" height="70" fill="#64748b" rx="5" />
              {/* Cooling fins */}
              <rect x="100" y="40" width="4" height="70" fill="#334155" />
              <rect x="110" y="40" width="4" height="70" fill="#334155" />
              <rect x="120" y="40" width="4" height="70" fill="#334155" />
              <rect x="130" y="40" width="4" height="70" fill="#334155" />
              <rect x="140" y="40" width="4" height="70" fill="#334155" />
              <rect x="150" y="40" width="4" height="70" fill="#334155" />
              <rect x="160" y="40" width="4" height="70" fill="#334155" />
              {/* Motor end cap */}
              <rect x="180" y="50" width="10" height="50" fill="#475569" rx="2" />
              
              {/* Pump casing (Volute) */}
              <circle cx="55" cy="75" r="35" fill="#1e293b" />
              <circle cx="55" cy="75" r="25" fill="#334155" />
              <circle cx="55" cy="75" r="10" fill="#0f172a" />
              
              {/* Discharge nozzle */}
              <rect x="40" y="10" width="30" height="40" fill="#1e293b" />
              <rect x="35" y="5" width="40" height="5" fill="#475569" />
              
              {/* Suction nozzle */}
              <rect x="5" y="60" width="20" height="30" fill="#1e293b" />
              <rect x="0" y="55" width="5" height="40" fill="#475569" />
              
              {/* Connecting shaft */}
              <motion.rect 
                x="85" y="70" width="10" height="10" fill="#94a3b8" 
                animate={isRunning ? { rotateX: [0, 180, 360] } : {}}
                transition={{ duration: 0.2, repeat: Infinity, ease: "linear" }}
              />
            </svg>
          </div>
          
          {/* Status Label Overlay */}
          <div className="absolute -bottom-2 w-full text-center">
            <span className={`font-bold text-lg tracking-widest ${statusColor} drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}>{statusText}</span>
          </div>
        </div>

        {/* Right Info */}
        <div className="w-1/2 flex flex-col gap-4">
          <div className="flex justify-between items-center text-xs text-gray-300">
            <div className="flex items-center gap-2"><Clock size={14} /> <span className="uppercase tracking-widest">Time</span></div>
            <span className="font-mono font-bold text-white">0:0 Hrs</span>
          </div>
          
          <div className="flex justify-between items-center text-xs text-gray-300">
            <div className="flex items-center gap-2"><Zap size={14} /> <span className="uppercase tracking-widest">Run On</span></div>
            <span className="font-bold text-white">{runOnTime}</span>
          </div>

          <div className="mt-2">
            <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Current (Amp)</div>
            <div className="flex justify-between px-2 text-xs font-mono font-bold">
              <div className="flex flex-col items-center"><span className="text-red-500">R</span><span className="text-white mt-1">{currentR}</span></div>
              <div className="flex flex-col items-center"><span className="text-yellow-500">Y</span><span className="text-white mt-1">{currentY}</span></div>
              <div className="flex flex-col items-center"><span className="text-blue-500">B</span><span className="text-white mt-1">{currentB}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
