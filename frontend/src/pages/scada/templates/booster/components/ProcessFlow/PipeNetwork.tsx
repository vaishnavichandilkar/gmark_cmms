import React from 'react';
import { motion } from 'framer-motion';

interface PipeProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  flowDirection?: 'forward' | 'backward' | 'none';
  hasFault?: boolean;
}

export const Pipe: React.FC<PipeProps> = ({ x1, y1, x2, y2, flowDirection = 'forward', hasFault = false }) => {
  const pipeColor = hasFault ? '#EF4444' : '#1e3a8a';
  const flowColor = hasFault ? '#FCA5A5' : '#3b82f6';
  const strokeDasharray = "5 10"; // Create the particles

  // Simple animation direction logic
  const animateTo = flowDirection === 'forward' ? -30 : flowDirection === 'backward' ? 30 : 0;
  
  return (
    <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible">
      {/* Outer pipe casing */}
      <line 
        x1={x1} y1={y1} x2={x2} y2={y2} 
        stroke={pipeColor} strokeWidth="12" strokeLinecap="round" 
        className="opacity-60"
      />
      {/* Inner flowing water */}
      <motion.line 
        x1={x1} y1={y1} x2={x2} y2={y2} 
        stroke={flowColor} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={strokeDasharray}
        initial={{ strokeDashoffset: 0 }}
        animate={flowDirection !== 'none' ? { strokeDashoffset: animateTo } : {}}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </svg>
  );
};

export const ProcessFlowContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative w-full h-[760px] bg-[#021B3A] rounded-[20px] p-6 flex items-center border border-[rgba(255,255,255,0.08)] shadow-inner">
      {children}
    </div>
  );
};
