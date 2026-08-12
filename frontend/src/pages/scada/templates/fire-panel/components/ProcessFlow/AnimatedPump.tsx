import React from 'react';

interface AnimatedPumpProps {
  isRunning: boolean;
  isFault: boolean;
}

export const AnimatedPump: React.FC<AnimatedPumpProps> = ({ isRunning, isFault }) => {
  return (
    <div className={`relative w-[280px] h-[168px] flex items-center justify-center ${isRunning ? 'animate-[vibrate_0.5s_linear_infinite]' : ''}`}>
      <style>
        {`
          @keyframes vibrate {
            0% { transform: translate(0, 0); }
            25% { transform: translate(0px, 1px); }
            50% { transform: translate(0, 0); }
            75% { transform: translate(0px, -1px); }
            100% { transform: translate(0, 0); }
          }
          @keyframes spin-fast {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .fan-spin {
            animation: spin-fast 0.2s linear infinite;
            transform-origin: 162px 70px;
          }
        `}
      </style>
      <svg viewBox="0 0 200 120" className={`w-full h-full ${isFault ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' : ''}`}>
        
        {/* Base Plate */}
        <path d="M 10 110 L 190 110 L 190 115 L 10 115 Z" fill="#111827" />
        <path d="M 20 105 L 180 105 L 180 110 L 20 110 Z" fill="#1f2937" />

        {/* --- MOTOR (Black part on the right) --- */}
        {/* Motor body */}
        <rect x="90" y="45" width="60" height="50" rx="4" fill="#1f2937" />
        {/* Cooling fins (Ribs) */}
        <line x1="95" y1="50" x2="145" y2="50" stroke="#111827" strokeWidth="2" />
        <line x1="95" y1="55" x2="145" y2="55" stroke="#111827" strokeWidth="2" />
        <line x1="95" y1="60" x2="145" y2="60" stroke="#111827" strokeWidth="2" />
        <line x1="95" y1="65" x2="145" y2="65" stroke="#111827" strokeWidth="2" />
        <line x1="95" y1="70" x2="145" y2="70" stroke="#111827" strokeWidth="2" />
        <line x1="95" y1="75" x2="145" y2="75" stroke="#111827" strokeWidth="2" />
        <line x1="95" y1="80" x2="145" y2="80" stroke="#111827" strokeWidth="2" />
        <line x1="95" y1="85" x2="145" y2="85" stroke="#111827" strokeWidth="2" />
        <line x1="95" y1="90" x2="145" y2="90" stroke="#111827" strokeWidth="2" />

        {/* Motor Terminal Box */}
        <rect x="105" y="30" width="30" height="15" rx="2" fill="#111827" />
        <rect x="110" y="27" width="20" height="3" fill="#374151" />

        {/* Motor Fan Cover */}
        <path d="M 150 42 L 170 42 A 5 5 0 0 1 175 47 L 175 93 A 5 5 0 0 1 170 98 L 150 98 Z" fill="#111827" />
        
        {/* Fan blades (Visible through slits, animated when running) */}
        <g className={isRunning ? 'fan-spin' : ''}>
          <line x1="162" y1="58" x2="162" y2="82" stroke="#9ca3af" strokeWidth="2" />
          <line x1="150" y1="70" x2="174" y2="70" stroke="#9ca3af" strokeWidth="2" />
          <line x1="154" y1="62" x2="170" y2="78" stroke="#9ca3af" strokeWidth="2" />
          <line x1="154" y1="78" x2="170" y2="62" stroke="#9ca3af" strokeWidth="2" />
          <circle cx="162" cy="70" r="3" fill="#cbd5e1" />
        </g>

        {/* Fan Cover Slits (overlay to hide fan parts outside slits) */}
        <rect x="155" y="45" width="2" height="50" fill="#111827" />
        <rect x="160" y="45" width="2" height="50" fill="#111827" />
        <rect x="165" y="45" width="2" height="50" fill="#111827" />
        <rect x="170" y="45" width="2" height="50" fill="#111827" />

        {/* Motor supports */}
        <rect x="100" y="95" width="10" height="10" fill="#1f2937" />
        <rect x="130" y="95" width="10" height="10" fill="#1f2937" />
        <rect x="95" y="102" width="50" height="3" fill="#111827" />

        {/* Coupling */}
        <rect x="80" y="55" width="10" height="30" fill="#374151" />
        <rect x="75" y="60" width="5" height="20" fill="#4b5563" />

        {/* --- PUMP (Green part on the left) --- */}
        {/* Pump housing/volute */}
        <circle cx="55" cy="70" r="28" fill="#059669" />
        <circle cx="55" cy="70" r="15" fill="#047857" />
        <circle cx="55" cy="70" r="6" fill="#064e3b" />
        
        {/* Housing bolts (decorative) */}
        <circle cx="55" cy="47" r="1.5" fill="#064e3b" />
        <circle cx="55" cy="93" r="1.5" fill="#064e3b" />
        <circle cx="32" cy="70" r="1.5" fill="#064e3b" />
        <circle cx="78" cy="70" r="1.5" fill="#064e3b" />
        <circle cx="39" cy="54" r="1.5" fill="#064e3b" />
        <circle cx="71" cy="86" r="1.5" fill="#064e3b" />
        <circle cx="39" cy="86" r="1.5" fill="#064e3b" />
        <circle cx="71" cy="54" r="1.5" fill="#064e3b" />

        {/* Top discharge flange */}
        <rect x="45" y="25" width="20" height="25" fill="#059669" />
        <rect x="40" y="20" width="30" height="5" fill="#047857" />
        <rect x="45" y="15" width="20" height="5" fill="#3b82f6" /> {/* Blue pipe connection indicator */}
        
        {/* Left suction flange */}
        <rect x="25" y="60" width="15" height="20" fill="#059669" />
        <rect x="20" y="55" width="5" height="30" fill="#047857" />
        
        {/* Pump support */}
        <path d="M 40 95 L 70 95 L 75 105 L 35 105 Z" fill="#059669" />
        
      </svg>
    </div>
  );
};
