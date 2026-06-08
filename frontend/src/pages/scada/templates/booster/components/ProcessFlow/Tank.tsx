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
        <h3 className="text-white text-xs font-bold tracking-widest uppercase mb-4 text-center leading-tight">
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
        {/* Tank background (glass effect) */}
        <div className="absolute inset-0 bg-[#0A2D5F]/30 border-2 border-[rgba(255,255,255,0.1)] rounded-[16px] overflow-hidden" style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
          {/* Water fill animation */}
          <motion.div 
            className="absolute bottom-0 w-full opacity-80"
            initial={{ height: '0%' }}
            animate={{ height: `${level}%` }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
          >
            {/* Wavy Surface Layer 1 (Back - Big Swell) */}
            <div className="absolute top-[-18px] left-0 w-[400%] h-[42px] opacity-40">
              <motion.div 
                className="flex w-full h-full"
                animate={{ x: ["-50%", "0%"] }}
                transition={{ repeat: Infinity, ease: "linear", duration: 5 }}
              >
                <svg className="w-1/2 h-full text-[#00E5FF]" preserveAspectRatio="none" viewBox="0 0 100 150" fill="currentColor">
                  <path d="M0,50 C25,0 75,100 100,50 L100,150 L0,150 Z" />
                </svg>
                <svg className="w-1/2 h-full text-[#00E5FF]" preserveAspectRatio="none" viewBox="0 0 100 150" fill="currentColor">
                  <path d="M0,50 C25,0 75,100 100,50 L100,150 L0,150 Z" />
                </svg>
              </motion.div>
            </div>

            {/* Wavy Surface Layer 2 (Front - Big Swell) */}
            <div className="absolute top-[-15px] left-0 w-[400%] h-[36px]">
              <motion.div 
                className="flex w-full h-full"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ repeat: Infinity, ease: "linear", duration: 4 }}
              >
                <svg className="w-1/2 h-full text-[#00A3FF]" preserveAspectRatio="none" viewBox="0 0 100 150" fill="currentColor">
                  <path d="M0,50 C25,0 75,100 100,50 L100,150 L0,150 Z" />
                </svg>
                <svg className="w-1/2 h-full text-[#00A3FF]" preserveAspectRatio="none" viewBox="0 0 100 150" fill="currentColor">
                  <path d="M0,50 C25,0 75,100 100,50 L100,150 L0,150 Z" />
                </svg>
              </motion.div>
            </div>

            {/* Solid fill below the wave */}
            <div className="absolute top-[14px] bottom-0 left-0 w-full bg-gradient-to-b from-[#00A3FF] to-[#0055FF]" />
          </motion.div>
        </div>

        {/* Tank top rim */}
        <div className="absolute top-[-8px] w-full h-4 rounded-[50%] border-2 border-[rgba(255,255,255,0.2)] bg-[#0A2D5F]/50"></div>
        {/* Tank bottom base */}
        <div className="absolute bottom-[-8px] w-full h-4 rounded-[50%] bg-gradient-to-b from-[rgba(255,255,255,0.2)] to-[#0A2D5F] border border-[rgba(255,255,255,0.1)]"></div>

        {/* Status text overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 drop-shadow-md">
          {isAvailable ? (
            <div className="flex items-center justify-center text-white bg-black/30 px-3 py-2 rounded min-w-[80px]">
              <span className="text-[11px] font-bold text-center leading-tight uppercase">WATER<br/>AVAILABLE</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-red-500 bg-black/40 px-3 py-2 rounded min-w-[80px]">
              <Droplets size={22} className="mb-1" />
              <span className="text-[10px] font-bold text-center leading-tight uppercase">WATER NOT<br/>AVAILABLE</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
