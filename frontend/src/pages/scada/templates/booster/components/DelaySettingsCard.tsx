import React from 'react';
import { Timer, Play, Hourglass, AlertTriangle, TrendingDown, RefreshCw } from 'lucide-react';

interface DelaySettingsCardProps {
  pumpOnDelay: number;
  nextFillingTime: number;
  overloadResetDelay: number;
  underloadResetDelay: number;
  vfdResetAfter?: number;
}

export const DelaySettingsCard: React.FC<DelaySettingsCardProps> = ({
  pumpOnDelay = 0,
  nextFillingTime = 0,
  overloadResetDelay = 0,
  underloadResetDelay = 0,
  vfdResetAfter = 0
}) => {
  const settings = [
    {
      title: 'Pump ON Delay',
      value: pumpOnDelay,
      unit: 's',
      color: 'from-purple-500/10 to-transparent',
      accentColor: 'text-[#BF5AF2]',
      borderColor: 'group-hover:border-purple-500/30',
      ringBorder: 'border-purple-500/20 group-hover:border-purple-500/50',
      glow: 'group-hover:shadow-[0_0_20px_rgba(191,90,242,0.15)]',
      icon: <Play size={12} className="text-[#BF5AF2]" />
    },
    {
      title: 'Next Fill Time',
      value: nextFillingTime,
      unit: 'm',
      color: 'from-cyan-500/10 to-transparent',
      accentColor: 'text-[#64D2FF]',
      borderColor: 'group-hover:border-cyan-500/30',
      ringBorder: 'border-cyan-500/20 group-hover:border-cyan-500/50',
      glow: 'group-hover:shadow-[0_0_20px_rgba(100,210,255,0.15)]',
      icon: <Hourglass size={12} className="text-[#64D2FF]" />
    },
    {
      title: 'Overload Reset',
      value: overloadResetDelay,
      unit: 'm',
      color: 'from-red-500/10 to-transparent',
      accentColor: 'text-[#FF453A]',
      borderColor: 'group-hover:border-red-500/30',
      ringBorder: 'border-red-500/20 group-hover:border-red-500/50',
      glow: 'group-hover:shadow-[0_0_20px_rgba(255,69,58,0.15)]',
      icon: <AlertTriangle size={12} className="text-[#FF453A]" />
    },
    {
      title: 'Underload Reset',
      value: underloadResetDelay,
      unit: 'm',
      color: 'from-orange-500/10 to-transparent',
      accentColor: 'text-[#FF9F0A]',
      borderColor: 'group-hover:border-orange-500/30',
      ringBorder: 'border-orange-500/20 group-hover:border-orange-500/50',
      glow: 'group-hover:shadow-[0_0_20px_rgba(255,159,10,0.15)]',
      icon: <TrendingDown size={12} className="text-[#FF9F0A]" />
    },
    {
      title: 'VFD Reset After',
      value: vfdResetAfter,
      unit: 'm',
      color: 'from-emerald-500/10 to-transparent',
      accentColor: 'text-[#30D158]',
      borderColor: 'group-hover:border-emerald-500/30',
      ringBorder: 'border-emerald-500/20 group-hover:border-emerald-500/50',
      glow: 'group-hover:shadow-[0_0_20px_rgba(48,209,88,0.15)]',
      icon: <RefreshCw size={12} className="text-[#30D158]" />
    }
  ];

  return (
    <div className="liquid-glass rounded-[32px] mb-6 p-6 border border-white/5 relative overflow-hidden">
      {/* Title Header */}
      <div className="flex items-center gap-2.5 mb-6">
        <div className="p-2 bg-purple-500/10 text-[#BF5AF2] rounded-xl border border-purple-500/20">
          <Timer size={18} />
        </div>
        <div>
          <h2 className="text-white font-black text-xs tracking-widest uppercase">Pump Delay Settings</h2>
          <p className="text-[9px] text-zinc-500 font-semibold tracking-wider uppercase mt-0.5">Control Timers & Automatic Resets</p>
        </div>
      </div>

      {/* Unique Pods Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {settings.map((item, idx) => (
          <div
            key={idx}
            className={`group bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-between text-center relative overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:bg-black/60 ${item.borderColor} ${item.glow} col-span-1 ${idx === 4 ? 'col-span-2 sm:col-span-1' : ''}`}
          >
            {/* Subtle Gradient Glow Background */}
            <div className={`absolute -inset-px bg-gradient-to-b ${item.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl`} />

            {/* Icon + Label Header */}
            <div className="flex items-center gap-1.5 mb-4 z-10">
              {item.icon}
              <span className="text-[9px] text-zinc-400 font-bold tracking-wider uppercase truncate max-w-[90px] sm:max-w-none">
                {item.title}
              </span>
            </div>

            {/* Glowing Ring Dial Display */}
            <div className="relative w-16 h-16 flex flex-col items-center justify-center rounded-full bg-[#050608] border border-white/5 z-10 transition-colors group-hover:border-white/10">
              {/* Rotating Dashed Accent Ring */}
              <div className={`absolute inset-0.5 rounded-full border border-dashed transition-transform duration-[1500ms] group-hover:rotate-180 ${item.ringBorder}`} />

              {/* Centered Value */}
              <span className="text-lg font-mono text-white font-bold tracking-tight z-10 leading-none">
                {item.value}
              </span>
              <span className={`text-[8px] font-mono font-black uppercase tracking-wider mt-1 opacity-65 ${item.accentColor} z-10`}>
                {item.unit}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
