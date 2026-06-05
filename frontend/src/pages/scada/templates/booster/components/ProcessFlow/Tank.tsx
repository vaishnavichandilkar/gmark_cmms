import React from 'react';
import { motion } from 'framer-motion';
import { Droplets } from 'lucide-react';

interface TankProps {
  level: number; // 0 to 100
  title?: string;
  scalePosition?: 'left' | 'right';
}

export const Tank: React.FC<TankProps> = ({ 
  level, 
  title = 'Overhead Tank', 
  scalePosition = 'left' 
}) => {
  const isAvailable = level > 0;

  return (
    <div className="relative w-32 h-64 flex flex-col items-center">
      <h3 className="text-white text-xs font-bold tracking-widest uppercase mb-4 whitespace-nowrap">{title}</h3>
      
      {/* 3D Tank container */}
      <div className="relative w-full h-full flex-1">
        {/* Tank background (glass effect) */}
        <div className="absolute inset-0 bg-[#0A2D5F]/30 border-2 border-[rgba(255,255,255,0.1)] rounded-[16px] overflow-hidden" style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
          {/* Water fill animation */}
          <motion.div 
            className="absolute bottom-0 w-full bg-gradient-to-b from-[#00A3FF] to-[#0055FF] opacity-80"
            initial={{ height: '0%' }}
            animate={{ height: `${level}%` }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
            style={{ 
              borderTopLeftRadius: level >= 95 ? '16px' : '0', 
              borderTopRightRadius: level >= 95 ? '16px' : '0' 
            }}
          >
            {/* Water surface highlight */}
            <div className="w-full h-2 bg-[rgba(255,255,255,0.3)] backdrop-blur-sm"></div>
          </motion.div>
        </div>

        {/* Tank top rim */}
        <div className="absolute top-[-8px] w-full h-4 rounded-[50%] border-2 border-[rgba(255,255,255,0.2)] bg-[#0A2D5F]/50"></div>
        {/* Tank bottom base */}
        <div className="absolute bottom-[-8px] w-full h-4 rounded-[50%] bg-gradient-to-b from-[rgba(255,255,255,0.2)] to-[#0A2D5F] border border-[rgba(255,255,255,0.1)]"></div>

        {/* Scale markings */}
        <div className={`absolute ${scalePosition === 'left' ? 'left-[-30px]' : 'right-[-30px]'} top-0 h-full flex flex-col justify-between py-2 text-[10px] text-gray-400 font-mono ${scalePosition === 'left' ? 'text-right' : 'text-left'}`}>
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>
        <div className={`absolute ${scalePosition === 'left' ? 'left-[-6px]' : 'right-[-6px]'} top-0 h-full w-[2px] bg-[rgba(255,255,255,0.1)] py-2 flex flex-col justify-between ${scalePosition === 'left' ? 'items-start' : 'items-end'}`}>
          <div className="w-2 h-[1px] bg-[rgba(255,255,255,0.3)]"></div>
          <div className="w-2 h-[1px] bg-[rgba(255,255,255,0.3)]"></div>
          <div className="w-2 h-[1px] bg-[rgba(255,255,255,0.3)]"></div>
          <div className="w-2 h-[1px] bg-[rgba(255,255,255,0.3)]"></div>
          <div className="w-2 h-[1px] bg-[rgba(255,255,255,0.3)]"></div>
        </div>

        {/* Status text overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 drop-shadow-md">
          {isAvailable ? (
            <span className="text-[#00E5FF] text-xl font-bold font-mono bg-black/30 px-2 rounded">{level}%</span>
          ) : (
            <div className="flex flex-col items-center text-red-500 bg-black/40 p-2 rounded">
              <Droplets size={24} className="mb-1" />
              <span className="text-[10px] font-bold text-center leading-tight">WATER NOT<br/>AVAILABLE</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
