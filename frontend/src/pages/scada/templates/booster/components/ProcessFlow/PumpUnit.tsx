import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Power, Clock } from 'lucide-react';
import { AnimatedPump } from './AnimatedPump';

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

  const totalCurrent = (currentR + currentY + currentB).toFixed(1);
  const powerKw = ((currentR + currentY + currentB) * 0.23).toFixed(1); // placeholder calc for kW

  return (
    <div className="flex flex-col items-center w-[420px]">
      <div
        className={`relative rounded-3xl p-4 bg-white border ${isFault ? 'border-[#ef4444]' : 'border-gray-200'} shadow-xl hover:shadow-2xl w-full flex flex-col transition-all duration-300`}
      >
        {/* Internal Pipe Connections (Top and Bottom) */}
        <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
          {/* Top connection to discharge flange */}
          <path d="M 146 -4 L 146 110" stroke="#64748b" strokeWidth="22" strokeLinecap="butt" strokeLinejoin="miter" fill="none" />
          <path d="M 146 -4 L 146 110" stroke="#94a3b8" strokeWidth="20" strokeLinecap="butt" strokeLinejoin="miter" fill="none" />
          <path d="M 146 -4 L 146 110" stroke="#cbd5e1" strokeWidth="14" strokeLinecap="butt" strokeLinejoin="miter" fill="none" />
          <path d="M 146 -4 L 146 110" stroke="#f8fafc" strokeWidth="6" strokeLinecap="butt" strokeLinejoin="miter" fill="none" />

          {isRunning && (
            <g>
              <path d="M 146 -4 L 146 110" stroke="#1d4ed8" strokeWidth="14" strokeLinecap="butt" strokeLinejoin="miter" fill="none" />
              <path d="M 146 -4 L 146 110" stroke="#3b82f6" strokeWidth="10" strokeLinecap="butt" strokeLinejoin="miter" fill="none" />
              <path d="M 146 -4 L 146 110" stroke="#60a5fa" strokeWidth="4" strokeLinecap="butt" strokeLinejoin="miter" fill="none" />
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
        <div className="w-full flex justify-between items-center mb-4 relative z-10 h-8">
          <h3 className="text-black font-extrabold text-lg tracking-wide uppercase bg-white/80 px-2 py-0.5 rounded-md backdrop-blur-sm -ml-2 leading-none flex items-center h-full">{name}</h3>
          
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
        <div className="w-full flex justify-center items-center relative mb-4 z-10">
          <AnimatedPump isRunning={isRunning} isFault={isFault} />
        </div>

        {/* 3 Metric Cards */}
        <div className="flex justify-between gap-1 w-full mb-6 relative z-10">
          {/* Current Card */}
          <div className="flex flex-col items-center justify-center bg-[#f8f9fa] rounded-xl py-2 px-1 border border-gray-100 shadow-sm flex-1">
            <div className="flex items-center gap-1 mb-1">
              <Zap className="w-3.5 h-3.5 text-[#00a651]" strokeWidth={2.5} />
              <span className="text-black font-bold text-xs leading-none">{totalCurrent} A</span>
            </div>
            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none">Current</span>
          </div>
          
          {/* Power Card */}
          <div className="flex flex-col items-center justify-center bg-[#f8f9fa] rounded-xl py-2 px-1 border border-gray-100 shadow-sm flex-1">
            <div className="flex items-center gap-1 mb-1">
              <Power className="w-3.5 h-3.5 text-[#00a651]" strokeWidth={2.5} />
              <span className="text-black font-bold text-xs leading-none">{powerKw} kW</span>
            </div>
            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none">Power</span>
          </div>

          {/* Time Card */}
          <div className="flex flex-col items-center justify-center bg-[#f8f9fa] rounded-xl py-2 px-1 border border-gray-100 shadow-sm flex-1">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-[#00a651]" strokeWidth={2.5} />
              <span className="text-black font-bold text-xs leading-none">{runOnTime.split(' ')[0]}</span>
            </div>
            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none">Run Time</span>
          </div>
        </div>

        {/* Current Amps Row */}
        <div className="w-full flex flex-col items-center relative z-10">
          <span className="text-[9px] font-extrabold text-gray-700 uppercase tracking-widest mb-3 bg-white/80 px-2 py-0.5 rounded-full backdrop-blur-sm">Current Amps</span>
          <div className="flex justify-between w-full px-6">
            <div className="flex flex-col items-center gap-1 bg-white/60 px-3 py-1 rounded-lg backdrop-blur-sm">
              <span className="text-[#ef4444] font-extrabold text-xs">R</span>
              <span className="text-black font-extrabold text-sm">{currentR}</span>
            </div>
            <div className="flex flex-col items-center gap-1 bg-white/60 px-3 py-1 rounded-lg backdrop-blur-sm">
              <span className="text-[#f59e0b] font-extrabold text-xs">Y</span>
              <span className="text-black font-extrabold text-sm">{currentY}</span>
            </div>
            <div className="flex flex-col items-center gap-1 bg-white/60 px-3 py-1 rounded-lg backdrop-blur-sm">
              <span className="text-[#3b82f6] font-extrabold text-xs">B</span>
              <span className="text-black font-extrabold text-sm">{currentB}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
