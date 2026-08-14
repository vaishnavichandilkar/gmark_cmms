import React from 'react';

export interface DieselEngine3DModelProps {
  status?: 'ON' | 'OFF' | 'TRIP';
}

export const DieselEngine3DModel: React.FC<DieselEngine3DModelProps> = ({ status = 'OFF' }) => {
  const isSpinning = status === 'ON';
  // Industrial Yellow gradients
  const yellowMain = "#eab308"; // Caterpillar yellow style
  const yellowDark = "#a16207";
  const yellowLight = "#fde047";

  // Silver/Steel gradients
  const steelMain = "#9ca3af";
  const steelDark = "#4b5563";
  const steelLight = "#f3f4f6";

  const engineDark = "#111827"; 
  const engineMain = "#1f2937";
  const engineLight = "#374151";

  return (
    <svg viewBox="0 0 350 220" className={`w-full h-full drop-shadow-2xl overflow-visible ${isSpinning ? 'pump-running' : ''}`}>
      <defs>
        <linearGradient id="deSteelGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={steelLight} />
          <stop offset="50%" stopColor={steelMain} />
          <stop offset="100%" stopColor={steelDark} />
        </linearGradient>
        <linearGradient id="deYellowGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={yellowLight} />
          <stop offset="30%" stopColor={yellowMain} />
          <stop offset="100%" stopColor={yellowDark} />
        </linearGradient>
        <linearGradient id="deEngineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={engineLight} />
          <stop offset="40%" stopColor={engineMain} />
          <stop offset="100%" stopColor={engineDark} />
        </linearGradient>
        <radialGradient id="radFan" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#111827" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
      </defs>

      {/* Main Base Skid */}
      <rect x="10" y="180" width="330" height="20" rx="2" fill="#111827" />
      <rect x="15" y="175" width="320" height="5" fill="#374151" />
      
      {/* Vibration Isolators */}
      {[30, 175, 320].map(x => (
        <path key={x} d={`M ${x-10} 200 L ${x+10} 200 L ${x+8} 210 L ${x-8} 210 Z`} fill="#000" />
      ))}

      {/* Alternator / Generator (Left) */}
      <rect x="25" y="70" width="95" height="105" rx="8" fill="url(#deSteelGrad)" />
      {/* Alternator Ribs */}
      {[...Array(7)].map((_, i) => (
        <rect key={`alt-rib-${i}`} x="35" y={80 + i * 12} width="75" height="5" fill="#1f2937" opacity="0.6" />
      ))}
      <rect x="20" y="90" width="10" height="60" rx="3" fill="#374151" />

      {/* Engine Block (Center) */}
      <rect x="115" y="55" width="140" height="120" rx="6" fill="url(#deEngineGrad)" />
      
      {/* Cylinder Heads */}
      {[...Array(6)].map((_, i) => (
        <g key={`cyl-${i}`}>
          <rect x={125 + i * 20} y="40" width="14" height="40" rx="3" fill="url(#deSteelGrad)" />
          <rect x={127 + i * 20} y="30" width="10" height="15" fill="#111827" />
        </g>
      ))}

      {/* Exhaust Manifold & Turbocharger */}
      <path d="M 125 70 L 235 70 L 235 85 L 125 85 Z" fill="url(#deSteelGrad)" />
      <circle cx="210" cy="50" r="18" fill="url(#deSteelGrad)" />
      <circle cx="210" cy="50" r="10" fill="#111827" />
      
      {/* Exhaust Pipe Upwards */}
      <path d="M 210 32 Q 210 10 240 10 L 250 10" fill="none" stroke="url(#deSteelGrad)" strokeWidth="14" strokeLinecap="round" />
      <rect x="235" y="0" width="25" height="20" rx="3" fill="#374151" />
      <rect x="260" y="2" width="6" height="16" fill="#111827" />

      {/* Radiator (Right) */}
      <rect x="270" y="30" width="60" height="145" rx="4" fill="#111827" />
      <rect x="275" y="35" width="50" height="135" fill="#1f2937" />
      {/* Radiator Fins */}
      {[...Array(26)].map((_, i) => (
        <rect key={`rad-${i}`} x="275" y={38 + i * 5} width="50" height="2" fill="#000" />
      ))}
      
      {/* Cooling Fan */}
      <ellipse cx="265" cy="105" rx="12" ry="45" fill="url(#radFan)" />
      
      {/* Fan Belt & Pulleys */}
      <circle cx="260" cy="150" r="12" fill="url(#deSteelGrad)" />
      <circle cx="260" cy="65" r="12" fill="url(#deSteelGrad)" />
      <path d="M 260 53 L 260 138" stroke="#111827" strokeWidth="4" />
      <path d="M 255 53 L 255 138" stroke="#111827" strokeWidth="4" />

      {/* Main Control Panel (Mounted on side of Engine) */}
      <rect x="140" y="80" width="65" height="85" rx="5" fill="url(#deYellowGrad)" />
      
      {/* Panel Screen */}
      <rect x="148" y="90" width="50" height="25" rx="2" fill="#111827" />
      <rect x="151" y="93" width="44" height="19" fill="#064e3b" />
      <text x="173" y="106" fill="#4ade80" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">1500 RPM</text>

      {/* Buttons */}
      <circle cx="155" cy="130" r="5" fill="#dc2626" stroke="#991b1b" />
      <circle cx="172" cy="130" r="5" fill="#22c55e" stroke="#166534" />
      <circle cx="189" cy="130" r="5" fill="#111827" stroke="#000" />
      
      {/* Danger Strip */}
      <rect x="148" y="150" width="50" height="6" fill="#dc2626" />
      <rect x="148" y="150" width="10" height="6" fill="#fff" />
      <rect x="168" y="150" width="10" height="6" fill="#fff" />
      <rect x="188" y="150" width="10" height="6" fill="#fff" />

      {/* Starter Motor (Bottom Left) */}
      <rect x="110" y="145" width="40" height="20" rx="10" fill="url(#deSteelGrad)" />
      <rect x="115" y="145" width="5" height="20" fill="#1f2937" opacity="0.5" />

      {/* Base Mounts / Pipes */}
      <path d="M 270 145 Q 180 160 170 175" fill="none" stroke="#1f2937" strokeWidth="6" />
      <path d="M 120 160 L 90 160" fill="none" stroke="url(#deSteelGrad)" strokeWidth="8" />
      
      {/* Air Filter (Top Right) */}
      <rect x="230" y="20" width="40" height="25" rx="12" fill="#374151" />
      <rect x="245" y="18" width="20" height="29" fill="#1f2937" />

    </svg>
  );
};
