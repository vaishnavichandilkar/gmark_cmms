import React from 'react';
import { RefreshCcw, Hand, Power, AlertTriangle } from 'lucide-react';
import { Pump3DModel } from './Pump3DModel';

export interface FirePumpCardProps {
  title: string;
  status: 'ON' | 'OFF' | 'TRIP';
  mode: 'AUTO' | 'OFF' | 'MANUAL';
  imageType: 'vertical' | 'horizontal';
  toggleState: boolean;
  onToggle?: () => void;
  hideImage?: boolean;
}

export const FirePumpCard: React.FC<FirePumpCardProps> = ({
  title,
  status,
  mode,
  imageType,
  toggleState,
  onToggle,
  hideImage = false
}) => {
  return (
    <div className="flex flex-col items-center p-2">
      <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100 p-5 px-4 flex flex-col items-center w-full min-w-[190px] max-w-[220px] h-full">
        {/* Title */}
        <h3 className="text-[11px] font-extrabold text-gray-800 uppercase tracking-wider text-center mb-4 flex items-center justify-center">
          {title}
        </h3>

        {/* Rotary Switch */}
        {/* Rotary Switch Container */}
        <div className="w-[160px] shrink-0 mb-5 relative">
          {/* 3D Border Wrapper */}
          <div className="w-full h-[100px] bg-[#ffd700] rounded-xl p-[2px] shadow-[0_3px_5px_rgba(0,0,0,0.2),inset_0_1px_2px_rgba(255,255,255,0.8),inset_0_-2px_4px_rgba(217,164,0,0.8)] border border-[#e6b800]">
            {/* Inner Yellow Background */}
            <div className="w-full h-full bg-[#ffcc00] rounded-lg shadow-[inset_0_2px_6px_rgba(0,0,0,0.15)] relative overflow-hidden">
              
              {/* OFF Text Top Center */}
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
                <span className="text-[10px] font-black text-gray-900 tracking-wider leading-none mb-1">OFF</span>
                <div className="w-1 h-1 bg-gray-900 rounded-full shadow-sm"></div>
              </div>

              {/* AUTO Section (Left) */}
              <div className="absolute left-[8px] top-[26px] flex flex-col items-center z-10 w-[40px]">
                <div className="bg-gray-900 text-white text-[7px] font-black px-1 py-0.5 rounded mb-1.5 tracking-wider shadow-sm w-full text-center">AUTO</div>
                <RefreshCcw size={12} className="text-gray-900 stroke-[2.5]" />
              </div>
              <div className="absolute top-[40px] left-[44px] w-[12px] h-[2.5px] bg-gray-900 rotate-[35deg] z-0 opacity-90 rounded-sm"></div>

              {/* MANUAL Section (Right) */}
              <div className="absolute right-[8px] top-[26px] flex flex-col items-center z-10 w-[40px]">
                <div className="bg-gray-900 text-white text-[7px] font-black px-1 py-0.5 rounded mb-1.5 tracking-wider shadow-sm w-full text-center">MANUAL</div>
                <Hand size={12} className="text-gray-900 stroke-[2.5]" />
              </div>
              <div className="absolute top-[40px] right-[44px] w-[12px] h-[2.5px] bg-gray-900 -rotate-[35deg] z-0 opacity-90 rounded-sm"></div>

              {/* Rotary Knob Base */}
              <div className="absolute top-[56px] left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-20">
                <svg 
                  className="transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] drop-shadow-md"
                  style={{ 
                    transformOrigin: '50% 50%',
                    transform: `rotate(${mode === 'AUTO' ? '-55deg' : mode === 'MANUAL' ? '55deg' : '0deg'})` 
                  }}
                  width="52" 
                  height="52" 
                  viewBox="0 0 100 100" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <radialGradient id="baseGrad" cx="35%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#ff4d4d" />
                      <stop offset="40%" stopColor="#cc0000" />
                      <stop offset="80%" stopColor="#990000" />
                      <stop offset="100%" stopColor="#4d0000" />
                    </radialGradient>
                    <linearGradient id="baseEdge" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#ff9999" />
                      <stop offset="100%" stopColor="#330000" />
                    </linearGradient>
                    <linearGradient id="handleGrad" x1="38" y1="0" x2="62" y2="0" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#4d0000" />
                      <stop offset="20%" stopColor="#cc0000" />
                      <stop offset="50%" stopColor="#ff1a1a" />
                      <stop offset="80%" stopColor="#cc0000" />
                      <stop offset="100%" stopColor="#4d0000" />
                    </linearGradient>
                    <linearGradient id="screwGrad" x1="42" y1="42" x2="58" y2="58" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#f3f4f6" />
                      <stop offset="50%" stopColor="#9ca3af" />
                      <stop offset="100%" stopColor="#374151" />
                    </linearGradient>
                    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#000000" floodOpacity="0.5"/>
                    </filter>
                  </defs>

                  {/* Red Circular Base */}
                  <circle cx="50" cy="50" r="48" fill="url(#baseEdge)" filter="url(#dropShadow)" />
                  <circle cx="50" cy="50" r="46" fill="url(#baseGrad)" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#ff8080" strokeWidth="0.5" opacity="0.6"/>

                  {/* Straight Pill Handle */}
                  <rect x="38" y="5" width="24" height="90" rx="12" fill="url(#handleGrad)" filter="url(#dropShadow)" />
                  
                  {/* Handle Center Ridge Highlight */}
                  <rect x="48" y="7" width="4" height="86" rx="2" fill="#ffffff" opacity="0.25" />

                  {/* White Arrow Triangle */}
                  <path d="M 50 12 L 56 22 L 44 22 Z" fill="#ffffff" stroke="#ffffff" strokeWidth="2.5" strokeLinejoin="round" />
                  
                  {/* Deep Recessed Screw Hole */}
                  <circle cx="50" cy="50" r="10" fill="#2a0000" />
                  <circle cx="50" cy="50" r="10" fill="none" stroke="#1a0000" strokeWidth="1" />

                  {/* Metallic Silver Screw */}
                  <circle cx="50" cy="50" r="8" fill="url(#screwGrad)" />
                  <circle cx="50" cy="50" r="8" fill="none" stroke="#4b5563" strokeWidth="0.5" />
                  
                  {/* Screw Slot */}
                  <rect x="49" y="43" width="2" height="14" fill="#1f2937" rx="1" />
                </svg>
              </div>

            </div>
          </div>
        </div>

        {/* Replica LEDs */}
        <div className="flex items-center justify-between w-full px-5 mb-3">
          {/* ON LED */}
          <div className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${status === 'ON' ? 'scale-105' : ''}`}>
            <div className={`w-7 h-7 rounded-full bg-[#008a3b] flex items-center justify-center border-2 border-[#00682b] shadow-inner ${status === 'ON' ? 'shadow-[0_0_12px_rgba(0,166,81,0.8)] drop-shadow-md' : ''}`}>
              <Power size={13} className="text-white stroke-[3] opacity-90" />
            </div>
            <span className="text-[10px] font-black text-gray-900 tracking-wide">ON</span>
          </div>

          {/* OFF LED */}
          <div className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${status === 'OFF' ? 'scale-105' : ''}`}>
            <div className={`w-7 h-7 rounded-full bg-[#4b5563] flex items-center justify-center border-2 border-[#374151] shadow-inner ${status === 'OFF' ? 'shadow-[0_0_12px_rgba(107,114,128,0.8)] drop-shadow-md' : ''}`}>
              <div className="w-[14px] h-[14px] rounded-full border-[2.5px] border-white flex items-center justify-center opacity-90">
                <div className="w-[3px] h-[3px] rounded-full bg-white"></div>
              </div>
            </div>
            <span className="text-[10px] font-black text-gray-900 tracking-wide">OFF</span>
          </div>

          {/* TRIP LED */}
          <div className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${status === 'TRIP' ? 'scale-105' : ''}`}>
            <div className={`w-7 h-7 rounded-full bg-[#dc2626] flex items-center justify-center border-2 border-[#b91c1c] shadow-inner ${status === 'TRIP' ? 'shadow-[0_0_12px_rgba(220,38,38,0.8)] drop-shadow-md' : ''}`}>
              <AlertTriangle size={13} className="text-white stroke-[3] opacity-90" />
            </div>
            <span className="text-[10px] font-black text-gray-900 tracking-wide">TRIP</span>
          </div>
        </div>

        {/* Industrial Action Button */}
        <div className="flex justify-center mt-2">
          <button
            onClick={onToggle}
            className={`w-28 h-9 rounded-full font-black text-[11px] tracking-wider transition-all duration-300 shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.4)] active:scale-95 active:shadow-[0_2px_3px_rgba(0,0,0,0.1)] flex items-center justify-center gap-1.5 ${
              toggleState
                ? 'bg-gradient-to-b from-[#ef4444] to-[#dc2626] text-white'
                : 'bg-gradient-to-b from-[#22c55e] to-[#16a34a] text-white'
            }`}
            style={{
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}
          >
            <Power size={14} className="stroke-[2.5]" />
            {toggleState ? 'STOP' : 'START'}
          </button>
        </div>
      </div>

      {/* Pump Image */}
      {!hideImage && (
        <div className={`mt-4 w-full flex justify-center ${imageType === 'vertical' ? 'h-[180px]' : 'h-[140px]'}`}>
          <Pump3DModel type={imageType} status={status} />
        </div>
      )}
    </div>
  );
};
