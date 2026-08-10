import React from 'react';

interface TankProps {
  level: number; // 0 to 100
  title?: string;
}

export const Tank: React.FC<TankProps> = ({
  level,
  title = 'UNDERGROUND TANK'
}) => {
  const clampedLevel = Math.max(0, Math.min(100, level));
  
  return (
    <div className="relative w-32 h-[300px] flex flex-col items-center font-sans">
      {/* Title */}
      {title && (
        <h3 className="text-black text-[10px] font-extrabold tracking-wider uppercase mb-1 text-center z-10 drop-shadow-sm">
          {title}
        </h3>
      )}

      {/* Tank Container */}
      <div className="relative w-full flex-1 flex flex-col items-center pb-8 mt-1 drop-shadow-xl">
        
        {/* Knob */}
        <div className="w-5 h-2 bg-gradient-to-r from-gray-700 via-gray-900 to-gray-700 rounded-t-sm z-20"></div>
        
        {/* Lid Cone */}
        <div 
          className="w-[85%] h-5 bg-gradient-to-r from-gray-400 via-gray-200 to-gray-500 z-20"
          style={{ clipPath: 'polygon(15% 0, 85% 0, 100% 100%, 0% 100%)' }}
        ></div>
        
        {/* Lid Rim */}
        <div className="w-full h-3 bg-gradient-to-r from-gray-500 via-gray-300 to-gray-600 rounded-sm z-20 shadow-md"></div>

        {/* Tank Body (Glass) */}
        <div className="relative w-[96%] flex-1 overflow-hidden flex flex-col justify-end rounded-b-md shadow-inner border-x border-gray-400/50"
             style={{
               background: 'linear-gradient(to right, rgba(140,140,140,0.8) 0%, rgba(230,230,230,0.8) 15%, rgba(200,200,200,0.4) 50%, rgba(220,220,220,0.8) 85%, rgba(120,120,120,0.8) 100%)'
             }}>
          
          {/* Water */}
          <div 
            className="w-full relative transition-all duration-500 ease-in-out flex flex-col"
            style={{ 
              height: `${clampedLevel}%`,
              background: 'linear-gradient(to right, #0947a1 0%, #2071e6 30%, #155bbd 70%, #06347d 100%)'
            }}
          >
            {/* Wavy Surface */}
            <svg 
              className="absolute top-0 left-0 w-full h-4 -mt-[3px] text-[#4aa3ff]" 
              viewBox="0 0 100 20" 
              preserveAspectRatio="none"
              fill="currentColor"
            >
              <path d="M 0 10 Q 15 0 30 10 T 65 10 T 100 10 L 100 20 L 0 20 Z" opacity="0.9"/>
              <path d="M 0 15 Q 20 5 40 15 T 80 15 T 100 15 L 100 20 L 0 20 Z" opacity="0.5" fill="#2071e6"/>
            </svg>

            {/* Subtle vertical gradients inside water to match cylinder look */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/40 pointer-events-none"></div>
          </div>
          
          {/* Glass glare effect (front reflection) */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-[30%] ml-[15%] pointer-events-none"></div>

          {/* Text Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30" style={{ filter: 'drop-shadow(0px 1px 3px rgba(0,0,0,0.8))' }}>
            <span className="text-white text-[9px] font-extrabold tracking-widest uppercase mb-1">Water Level</span>
            <span className="text-white text-[32px] font-bold leading-none my-0.5">{clampedLevel.toFixed(1)}%</span>
            <span className="text-white text-[11px] font-bold mt-1">{(clampedLevel * 0.05).toFixed(2)} m</span>
          </div>
        </div>

        {/* Base Rim */}
        <div className="w-full h-3 bg-gradient-to-r from-gray-600 via-gray-300 to-gray-700 rounded-sm z-20 shadow-md"></div>
        
        {/* Base Pipe Flange Connection point */}
        <div className="absolute bottom-6 right-[-8px] w-4 h-6 bg-gradient-to-b from-gray-400 via-gray-300 to-gray-500 rounded-sm z-10 border border-gray-400 shadow-md flex items-center justify-center opacity-0">
            {/* Kept hidden, pipe network connects perfectly through the bottom */}
        </div>
      </div>
      
      {/* Alarm Badge */}
      {level < 20 && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold tracking-widest px-3 py-1 rounded shadow-sm whitespace-nowrap z-40">
          LOW LEVEL ALARM
        </div>
      )}
    </div>
  );
};
