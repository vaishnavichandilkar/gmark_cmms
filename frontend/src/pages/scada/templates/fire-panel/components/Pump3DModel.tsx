import React from 'react';

export interface Pump3DModelProps {
  type: 'horizontal' | 'vertical';
  status?: 'ON' | 'OFF' | 'TRIP';
}

export const Pump3DModel: React.FC<Pump3DModelProps> = ({ type, status = 'OFF' }) => {
  // When ON, we can add a slight pulsing animation to the silver parts (representing flow/spinning)
  const isSpinning = status === 'ON';
  
  // Industrial Red gradients
  const redMain = "#dc2626"; // Tailwind red-600
  const redDark = "#991b1b"; // Tailwind red-800
  const redDeep = "#7f1d1d"; // Tailwind red-900
  const redLight = "#ef4444"; // Tailwind red-500

  // Silver/Steel gradients
  const steelMain = "#9ca3af";
  const steelDark = "#4b5563";
  const steelLight = "#f3f4f6";

  const renderHorizontal = () => (
    <svg viewBox="0 0 220 140" className={`w-full h-full drop-shadow-2xl overflow-visible ${isSpinning ? 'pump-running' : ''}`}>
      <defs>
        <linearGradient id="hMotorGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={redLight} />
          <stop offset="20%" stopColor={redMain} />
          <stop offset="70%" stopColor={redDark} />
          <stop offset="100%" stopColor={redDeep} />
        </linearGradient>
        <linearGradient id="hSteelGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={steelLight} />
          <stop offset="40%" stopColor={steelMain} />
          <stop offset="100%" stopColor={steelDark} />
        </linearGradient>
        <radialGradient id="hVoluteGrad" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor={redLight} />
          <stop offset="60%" stopColor={redMain} />
          <stop offset="100%" stopColor={redDeep} />
        </radialGradient>
      </defs>

      {/* Base Plate */}
      <path d="M 20 120 L 190 120 L 205 135 L 5 135 Z" fill="#374151" stroke="#1f2937" strokeWidth="1" />
      <rect x="25" y="125" width="10" height="4" fill="#1f2937" />
      <rect x="175" y="125" width="10" height="4" fill="#1f2937" />

      {/* Motor Body (Right) */}
      <rect x="100" y="45" width="80" height="65" rx="6" fill="url(#hMotorGrad)" />
      
      {/* Motor Cooling Fins */}
      {[...Array(8)].map((_, i) => (
        <rect key={`fin-${i}`} x="105" y={48 + i * 8} width="70" height="3" fill="#000" opacity="0.25" />
      ))}

      {/* Motor End Cap */}
      <path d="M 180 45 Q 195 45 195 77.5 Q 195 110 180 110 Z" fill={redDark} />
      <ellipse cx="180" cy="77.5" rx="4" ry="25" fill={redDeep} opacity="0.6" />

      {/* Terminal Box */}
      <rect x="125" y="25" width="30" height="22" rx="3" fill="url(#hMotorGrad)" />
      <rect x="128" y="25" width="24" height="6" fill={redDeep} />
      <circle cx="150" cy="36" r="3" fill="#1f2937" />

      {/* Coupling / Shaft */}
      <rect x="80" y="70" width="20" height="15" fill="url(#hSteelGrad)" />
      {/* Spinning element effect */}
      <rect x="85" y="65" width="10" height="25" fill="#1f2937" />
      <rect x="87" y="65" width="6" height="25" fill={steelLight} opacity={isSpinning ? 0.8 : 0.2} className={isSpinning ? "animate-pulse" : ""} />

      {/* Pump Housing (Volute) - Left */}
      <circle cx="55" cy="77.5" r="35" fill="url(#hVoluteGrad)" />
      <circle cx="55" cy="77.5" r="18" fill={redDeep} />
      
      {/* Bolt circle */}
      {[0, 60, 120, 180, 240, 300].map(angle => {
        const rad = angle * (Math.PI / 180);
        const x = 55 + 26 * Math.cos(rad);
        const y = 77.5 + 26 * Math.sin(rad);
        return <circle key={`bolt-${angle}`} cx={x} cy={y} r="2.5" fill={steelMain} />;
      })}

      {/* Discharge Pipe (Up) */}
      <rect x="40" y="15" width="26" height="40" fill="url(#hMotorGrad)" />
      <rect x="35" y="10" width="36" height="10" rx="2" fill={redDark} />
      <circle cx="42" cy="15" r="2.5" fill="#1f2937" />
      <circle cx="64" cy="15" r="2.5" fill="#1f2937" />

      {/* Suction Pipe (Left) */}
      <rect x="10" y="62.5" width="30" height="30" fill="url(#hMotorGrad)" />
      <rect x="5" y="50" width="10" height="55" rx="2" fill={redDark} />
      <circle cx="10" cy="58" r="2.5" fill="#1f2937" />
      <circle cx="10" cy="97" r="2.5" fill="#1f2937" />
    </svg>
  );

  const renderVertical = () => (
    <svg viewBox="0 0 140 260" className={`w-full h-full drop-shadow-2xl overflow-visible ${isSpinning ? 'pump-running' : ''}`}>
      <defs>
        <linearGradient id="vMotorGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={redLight} />
          <stop offset="25%" stopColor={redMain} />
          <stop offset="75%" stopColor={redDark} />
          <stop offset="100%" stopColor={redDeep} />
        </linearGradient>
        <linearGradient id="vSteelGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={steelLight} />
          <stop offset="50%" stopColor={steelMain} />
          <stop offset="100%" stopColor={steelDark} />
        </linearGradient>
        <linearGradient id="vSteelDark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={steelMain} />
          <stop offset="50%" stopColor={steelDark} />
          <stop offset="100%" stopColor="#1f2937" />
        </linearGradient>
      </defs>

      {/* Base Plate */}
      <ellipse cx="70" cy="245" rx="55" ry="12" fill="#374151" stroke="#1f2937" strokeWidth="2" />
      <rect x="25" y="240" width="15" height="6" fill="#1f2937" />
      <rect x="100" y="240" width="15" height="6" fill="#1f2937" />

      {/* Base Casing / Lower Volute */}
      <path d="M 35 210 L 105 210 L 115 240 L 25 240 Z" fill="url(#vMotorGrad)" />
      <ellipse cx="70" cy="210" rx="35" ry="10" fill={redDark} />

      {/* Suction & Discharge Flanges */}
      {/* Left Pipe */}
      <rect x="15" y="215" width="30" height="20" fill="url(#vMotorGrad)" />
      <rect x="10" y="208" width="10" height="34" rx="3" fill={redDark} />
      <circle cx="15" cy="216" r="2.5" fill="#1f2937" />
      <circle cx="15" cy="234" r="2.5" fill="#1f2937" />
      
      {/* Right Pipe */}
      <rect x="95" y="215" width="30" height="20" fill="url(#vMotorGrad)" />
      <rect x="120" y="208" width="10" height="34" rx="3" fill={redDark} />
      <circle cx="125" cy="216" r="2.5" fill="#1f2937" />
      <circle cx="125" cy="234" r="2.5" fill="#1f2937" />

      {/* Vertical Staging Column */}
      <rect x="50" y="115" width="40" height="95" fill="url(#vSteelGrad)" />
      
      {/* Impeller Stages */}
      {[...Array(6)].map((_, i) => (
        <g key={`stage-${i}`}>
          <rect x="42" y={125 + i * 15} width="56" height="8" rx="2" fill="url(#vMotorGrad)" />
          {/* Bolts */}
          <circle cx="47" cy={129 + i * 15} r="1.5" fill={steelMain} />
          <circle cx="93" cy={129 + i * 15} r="1.5" fill={steelMain} />
        </g>
      ))}

      {/* Motor Support Base */}
      <path d="M 45 90 L 95 90 L 105 115 L 35 115 Z" fill="#1f2937" />
      <ellipse cx="70" cy="90" rx="25" ry="6" fill="#111827" />
      
      {/* Shaft (visible in support) */}
      <rect x="65" y="95" width="10" height="20" fill="url(#vSteelGrad)" />
      <rect x="67" y="95" width="6" height="20" fill={steelLight} opacity={isSpinning ? 0.8 : 0.2} className={isSpinning ? "animate-pulse" : ""} />

      {/* Motor Body */}
      <rect x="40" y="25" width="60" height="65" rx="5" fill="url(#vMotorGrad)" />
      
      {/* Vertical Fins */}
      {[...Array(6)].map((_, i) => (
        <rect key={`vfin-${i}`} x="48 + i * 9" y="25" width="3" height="65" fill="#000" opacity="0.25" />
      ))}

      {/* Top Cap */}
      <ellipse cx="70" cy="25" rx="30" ry="10" fill={redLight} />
      <rect x="50" y="10" width="40" height="15" rx="4" fill="url(#vMotorGrad)" />
      <ellipse cx="70" cy="10" rx="20" ry="5" fill={redDark} />

      {/* Terminal Box (Left) */}
      <rect x="22" y="45" width="22" height="30" rx="4" fill="url(#vMotorGrad)" />
      <rect x="22" y="48" width="6" height="24" fill={redDeep} />
      <circle cx="33" cy="65" r="3" fill="#1f2937" />
    </svg>
  );

  return type === 'horizontal' ? renderHorizontal() : renderVertical();
};
