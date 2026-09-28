import React from 'react';
import { Zap, Power, Clock, Loader2, ShieldAlert } from 'lucide-react';
import { AnimatedPump } from './AnimatedPump';

interface PumpUnitProps {
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'RUNNING' | 'FAULT' | 'WARNING' | 'OFF';
  currentR: number;
  currentY: number;
  currentB: number;
  mode: 'AUTO' | 'MANUAL' | 'OFF';
  runOnTime: string;
  onToggle?: () => void;
  onModeChange?: (mode: 'AUTO' | 'MANUAL' | 'OFF') => void;
  isPending?: boolean;
  isWaterAvailable?: boolean;
}

export const PumpUnit: React.FC<PumpUnitProps> = ({
  name,
  status,
  currentR,
  currentY,
  currentB,
  mode,
  runOnTime,
  onToggle,
  onModeChange,
  isPending = false,
  isWaterAvailable = true,
}) => {
  const isRunning = status === 'RUNNING';
  const isFault = status === 'FAULT';
  const isStartBlocked = !isRunning && !isWaterAvailable;

  const totalCurrent = (currentR + currentY + currentB).toFixed(1);
  const powerKw = ((currentR + currentY + currentB) * 0.23).toFixed(1); // placeholder calc for kW

  return (
    <div className="flex flex-col items-center w-[420px]">
      <div
        className={`relative rounded-3xl p-3.5 bg-white border ${isFault ? 'border-[#ef4444]' : 'border-gray-200'} shadow-xl hover:shadow-2xl w-full flex flex-col transition-all duration-300`}
      >
        {/* Internal Pipe Connections (Top and Bottom) */}
        <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
          {/* Top connection to discharge flange */}
          <path d="M 147 -4 L 147 110" stroke="#64748b" strokeWidth="22" strokeLinecap="butt" strokeLinejoin="miter" fill="none" />
          <path d="M 147 -4 L 147 110" stroke="#94a3b8" strokeWidth="20" strokeLinecap="butt" strokeLinejoin="miter" fill="none" />
          <path d="M 147 -4 L 147 110" stroke="#cbd5e1" strokeWidth="14" strokeLinecap="butt" strokeLinejoin="miter" fill="none" />
          <path d="M 147 -4 L 147 110" stroke="#f8fafc" strokeWidth="6" strokeLinecap="butt" strokeLinejoin="miter" fill="none" />

          {isRunning && (
            <g>
              <path d="M 147 -4 L 147 110" stroke="#1d4ed8" strokeWidth="14" strokeLinecap="butt" strokeLinejoin="miter" fill="none" />
              <path d="M 147 -4 L 147 110" stroke="#3b82f6" strokeWidth="10" strokeLinecap="butt" strokeLinejoin="miter" fill="none" />
              <path d="M 147 -4 L 147 110" stroke="#60a5fa" strokeWidth="4" strokeLinecap="butt" strokeLinejoin="miter" fill="none" />
            </g>
          )}

          {/* Left connection to suction flange */}
          <path d="M -4 162 L 120 162" stroke="#64748b" strokeWidth="22" strokeLinecap="butt" strokeLinejoin="miter" fill="none" />
          <path d="M -4 162 L 120 162" stroke="#94a3b8" strokeWidth="20" strokeLinecap="butt" strokeLinejoin="miter" fill="none" />
          <path d="M -4 162 L 120 162" stroke="#cbd5e1" strokeWidth="14" strokeLinecap="butt" strokeLinejoin="miter" fill="none" />
          <path d="M -4 162 L 120 162" stroke="#f8fafc" strokeWidth="6" strokeLinecap="butt" strokeLinejoin="miter" fill="none" />

          {isRunning && (
            <g>
              <path d="M -4 162 L 120 162" stroke="#1d4ed8" strokeWidth="14" strokeLinecap="butt" strokeLinejoin="miter" fill="none" />
              <path d="M -4 162 L 120 162" stroke="#3b82f6" strokeWidth="10" strokeLinecap="butt" strokeLinejoin="miter" fill="none" />
              <path d="M -4 162 L 120 162" stroke="#60a5fa" strokeWidth="4" strokeLinecap="butt" strokeLinejoin="miter" fill="none" />
            </g>
          )}
        </svg>

        {/* Top Header */}
        <div className="w-full flex justify-between items-center mb-2 relative z-10 h-9">
          <div className="flex flex-col justify-center -ml-1">
            <h3 className="text-black font-extrabold text-base tracking-wide uppercase leading-none">{name}</h3>
            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border w-fit mt-1 leading-none ${
              isRunning 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 animate-pulse'
                : isFault
                ? 'bg-red-50 text-red-700 border-red-300'
                : 'bg-gray-100 text-gray-600 border-gray-200'
            }`}>
              {status}
            </span>
          </div>
          
          {/* Mode Selector - Segmented Control */}
          <div className="flex bg-[#f8f9fa] p-1 rounded-lg gap-1 border border-gray-100 shadow-sm relative h-full items-center">
            <button
              onClick={() => onModeChange?.('AUTO')}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all duration-300 ${mode === 'AUTO' ? 'bg-[#00a651] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
            >
              AUTO
            </button>
            <button
              onClick={() => onModeChange?.('OFF')}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all duration-300 ${mode === 'OFF' ? 'bg-[#00a651] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
            >
              OFF
            </button>
            <button
              onClick={() => onModeChange?.('MANUAL')}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all duration-300 ${mode === 'MANUAL' ? 'bg-[#00a651] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
            >
              MANUAL
            </button>
          </div>
        </div>

        {/* Pump Image */}
        <div className="w-full flex justify-center items-center relative mb-2 z-10">
          <AnimatedPump isRunning={isRunning} isFault={isFault} />
        </div>

        {/* 3 Metric Cards */}
        <div className="flex justify-between gap-1.5 w-full mb-3 relative z-10">
          {/* Current Card */}
          <div className="flex flex-col items-center justify-center bg-[#f8f9fa] rounded-xl py-1.5 px-1 border border-gray-100 shadow-sm flex-1">
            <div className="flex items-center gap-1 mb-0.5">
              <Zap className="w-3.5 h-3.5 text-[#00a651]" strokeWidth={2.5} />
              <span className="text-black font-bold text-xs leading-none">{totalCurrent} A</span>
            </div>
            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none">Current</span>
          </div>
          
          {/* Power Card */}
          <div className="flex flex-col items-center justify-center bg-[#f8f9fa] rounded-xl py-1.5 px-1 border border-gray-100 shadow-sm flex-1">
            <div className="flex items-center gap-1 mb-0.5">
              <Power className="w-3.5 h-3.5 text-[#00a651]" strokeWidth={2.5} />
              <span className="text-black font-bold text-xs leading-none">{powerKw} kW</span>
            </div>
            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none">Power</span>
          </div>

          {/* Time Card */}
          <div className="flex flex-col items-center justify-center bg-[#f8f9fa] rounded-xl py-1.5 px-1 border border-gray-100 shadow-sm flex-1">
            <div className="flex items-center gap-1 mb-0.5">
              <Clock className="w-3.5 h-3.5 text-[#00a651]" strokeWidth={2.5} />
              <span className="text-black font-bold text-xs leading-none">{runOnTime.split(' ')[0]}</span>
            </div>
            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none">Run Time</span>
          </div>
        </div>

        {/* Current Amps Row */}
        <div className="w-full flex flex-col items-center relative z-10 mb-3">
          <span className="text-[9px] font-extrabold text-gray-700 uppercase tracking-widest mb-1.5 bg-white/80 px-2 py-0.5 rounded-full backdrop-blur-sm">Current Amps</span>
          <div className="flex justify-between w-full px-6">
            <div className="flex flex-col items-center gap-0.5 bg-white/60 px-3 py-1 rounded-lg backdrop-blur-sm">
              <span className="text-[#ef4444] font-extrabold text-xs">R</span>
              <span className="text-black font-extrabold text-sm">{currentR}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 bg-white/60 px-3 py-1 rounded-lg backdrop-blur-sm">
              <span className="text-[#f59e0b] font-extrabold text-xs">Y</span>
              <span className="text-black font-extrabold text-sm">{currentY}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 bg-white/60 px-3 py-1 rounded-lg backdrop-blur-sm">
              <span className="text-[#3b82f6] font-extrabold text-xs">B</span>
              <span className="text-black font-extrabold text-sm">{currentB}</span>
            </div>
          </div>
        </div>

        {/* Industrial Action Button */}
        <div className="w-full flex justify-center relative z-10">
          <button
            onClick={onToggle}
            disabled={isPending}
            title={isStartBlocked ? 'Low Suction Water Level - Pumps Disabled (Dry-run protection)' : undefined}
            className={`w-full h-9 rounded-xl font-extrabold text-xs tracking-wider transition-all duration-300 shadow-md flex items-center justify-center gap-2 ${
              isPending
                ? 'bg-gray-400 text-white cursor-wait opacity-90'
                : isRunning
                ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-red-500/20 active:scale-98 cursor-pointer'
                : isStartBlocked
                ? 'bg-gray-100 text-gray-400 border border-gray-300 hover:bg-gray-100 shadow-none cursor-pointer'
                : 'bg-gradient-to-r from-[#00a651] to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/20 active:scale-98 cursor-pointer'
            }`}
          >
            {isPending ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>TRANSMITTING...</span>
              </>
            ) : isRunning ? (
              <>
                <Power size={14} className="stroke-[2.5]" />
                <span>STOP PUMP</span>
              </>
            ) : isStartBlocked ? (
              <>
                <ShieldAlert size={14} className="text-amber-500 stroke-[2.5]" />
                <span className="text-gray-500">DISABLED (LOW WATER)</span>
              </>
            ) : (
              <>
                <Power size={14} className="stroke-[2.5]" />
                <span>START PUMP</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
