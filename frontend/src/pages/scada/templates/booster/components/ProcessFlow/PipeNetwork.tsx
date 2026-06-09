import React from 'react';
import { motion } from 'framer-motion';

interface PipeProps {
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  path?: string;
  flowDirection?: 'forward' | 'backward' | 'none';
  hasFault?: boolean;
  capStyle?: 'round' | 'butt' | 'square';
}

export const Pipe: React.FC<PipeProps> = ({ x1 = 0, y1 = 0, x2 = 0, y2 = 0, path, flowDirection = 'forward', hasFault = false, capStyle = 'round' }) => {
  const isFlowing = flowDirection !== 'none';
  const flowColor = hasFault ? '#FF453A' : '#14b8a6'; // Changed to match new Teal theme
  const strokeDasharray = "6 12";
  const animateTo = flowDirection === 'forward' ? -36 : flowDirection === 'backward' ? 36 : 0;
  
  const d = path || `M ${x1} ${y1} L ${x2} ${y2}`;

  return (
    <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible">
      {/* Acrylic outer wall (specular edge reflection) */}
      <path 
        d={d}
        stroke="rgba(255,255,255,0.08)" strokeWidth="14" strokeLinecap={capStyle} strokeLinejoin="round" fill="none"
      />
      {/* Acrylic body core (refracted dark glass) */}
      <path 
        d={d}
        stroke="rgba(10,10,12,0.6)" strokeWidth="12" strokeLinecap={capStyle} strokeLinejoin="round" fill="none"
      />
      
      {/* Liquid core back blur / glow (slowly pulsing) */}
      <motion.path 
        d={d}
        stroke={flowColor} strokeWidth="8" strokeLinecap={capStyle} strokeLinejoin="round" fill="none"
        className="blur-[4px] transition-opacity duration-300"
        strokeDasharray={strokeDasharray}
        initial={{ strokeDashoffset: 0, opacity: 0.08 }}
        animate={isFlowing ? { 
          strokeDashoffset: animateTo,
          opacity: [0.15, 0.35, 0.15]
        } : { opacity: 0.08 }}
        transition={isFlowing ? { 
          strokeDashoffset: { duration: 1.2, repeat: Infinity, ease: "linear" },
          opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        } : {}}
      />

      {/* Inner flowing water particles (sharp stream) */}
      <motion.path 
        d={d}
        stroke={flowColor} strokeWidth="3" strokeLinecap={capStyle} strokeLinejoin="round" fill="none"
        className={`transition-opacity duration-300 ${isFlowing ? 'opacity-80' : 'opacity-10'}`}
        strokeDasharray={strokeDasharray}
        initial={{ strokeDashoffset: 0 }}
        animate={isFlowing ? { strokeDashoffset: animateTo } : {}}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
      />

      {/* Specular central reflection line (creates cylindrical shine) */}
      <path 
        d={d}
        stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" strokeLinecap={capStyle} strokeLinejoin="round" fill="none"
      />
    </svg>
  );
};

export const ProcessFlowContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative w-full h-[760px] liquid-glass rounded-[24px] p-6 flex items-center">
      {children}
    </div>
  );
};
