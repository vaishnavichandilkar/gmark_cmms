import React from 'react';
import { motion } from 'framer-motion';
import { Droplets } from 'lucide-react';

interface TankProps {
  level: number; // 0 to 100
  title?: string;
}

export const Tank: React.FC<TankProps> = ({
  level,
  title = 'Overhead Tank'
}) => {
  const isAvailable = level > 0;

  return (
    <div className="relative w-32 h-64 flex flex-col items-center">
      {title && (
        <h3 className="text-white text-xs font-semibold tracking-widest uppercase mb-4 text-center leading-tight">
          {title.split(' ').map((word, index) => (
            <React.Fragment key={index}>
              {word}
              {index < title.split(' ').length - 1 && <br />}
            </React.Fragment>
          ))}
        </h3>
      )}

      {/* 3D Tank container */}
      <div className="relative w-full h-full flex-1">
        {/* Tank background (liquid glass effect) */}
        <div 
          className="absolute inset-0 rounded-[16px] overflow-hidden shadow-[inset_0_0_24px_rgba(0,0,0,0.6),0_8px_32px_rgba(0,0,0,0.5)] border-l-2 border-r-2 border-t border-b border-l-white/10 border-r-white/10 border-t-white/4 border-b-white/4 bg-white/[0.02]"
        >
          {/* Glass Highlights */}
          <div className="absolute top-0 bottom-0 left-3 w-2 bg-gradient-to-r from-white/10 to-transparent rounded-full z-20 pointer-events-none" />
          <div className="absolute top-0 bottom-0 right-3 w-1.5 bg-gradient-to-l from-white/5 to-transparent rounded-full z-20 pointer-events-none" />

          {/* Water fill animation */}
          <motion.div
            className="absolute bottom-0 w-full"
            initial={{ height: '0%' }}
            animate={{ height: `${level}%` }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
          >
            {/* Top water ellipse to show 3D volume */}
            {level > 0 && (
              <div className="absolute top-[-8px] left-0 w-full h-4 rounded-[50%] bg-[#2171B5] border-t border-[#3A95E8] shadow-[inset_0_0_8px_rgba(0,0,0,0.2)] z-20 pointer-events-none" />
            )}

            {/* Refractive water body with background blur */}
            <div className="absolute top-0 bottom-0 left-0 w-full bg-gradient-to-b from-[#1C4E80] to-[#0F2A4A] backdrop-blur-[8px]" />
            
            {/* Inner cylinder highlights inside water */}
            <div className="absolute top-0 bottom-0 left-3 w-1 bg-white/10 rounded-full z-10 pointer-events-none" />
          </motion.div>
        </div>

        {/* Tank top rim */}
        <div className="absolute top-[-8px] w-full h-4 rounded-[50%] border-t border-l border-r border-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] z-20 pointer-events-none"></div>
        {/* Tank bottom base */}
        <div className="absolute bottom-[-8px] w-full h-4 rounded-[50%] bg-gradient-to-b from-white/[0.04] to-black/90 border-b border-l border-r border-white/5 z-20 pointer-events-none"></div>


        {/* Status text overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          {isAvailable ? (
            <div className="flex items-center justify-center text-[#30D158] bg-transparent border border-[#30D158]/70 px-4 py-2.5 rounded-2xl min-w-[100px] shadow-[inset_0_0_15px_rgba(48,209,88,0.15),0_4px_10px_rgba(0,0,0,0.3)] backdrop-blur-sm">
              <span className="text-[11px] font-semibold text-center leading-tight uppercase tracking-wide">WATER<br />AVAILABLE</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-[#FF453A] bg-transparent border border-[#FF453A]/70 px-4 py-2.5 rounded-2xl min-w-[100px] shadow-[inset_0_0_15px_rgba(255,69,58,0.15),0_4px_10px_rgba(0,0,0,0.3)] backdrop-blur-sm">
              <Droplets size={20} className="mb-1 text-[#FF453A] opacity-80" />
              <span className="text-[10px] font-semibold text-center leading-tight uppercase tracking-wide">WATER NOT<br />AVAILABLE</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
