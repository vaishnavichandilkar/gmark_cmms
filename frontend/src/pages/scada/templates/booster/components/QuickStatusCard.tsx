import React from 'react';
import { Zap, Sliders, ShieldCheck, DoorOpen, HardDrive } from 'lucide-react';

interface QuickStatusCardProps {
  powerStatus?: string;
}

export const QuickStatusCard: React.FC<QuickStatusCardProps> = ({ powerStatus = 'OK' }) => {
  const statuses = [
    { label: 'Power Status', value: powerStatus, icon: <Zap size={16} />, color: powerStatus === 'OK' ? 'text-[#30D158]' : 'text-[#FF453A]' },
    { label: 'Control Mode', value: 'AUTO', icon: <Sliders size={16} />, color: 'text-[#30D158]' },
    { label: 'VFD Status', value: 'NORMAL', icon: <HardDrive size={16} />, color: 'text-[#30D158]' },
    { label: 'Motor Protection', value: 'OK', icon: <ShieldCheck size={16} />, color: 'text-[#30D158]' },
    { label: 'Door Status', value: 'CLOSED', icon: <DoorOpen size={16} />, color: 'text-[#30D158]' },
  ];

  return (
    <div className="liquid-glass rounded-[24px] mb-4 transition-all duration-300 hover:-translate-y-[3px] p-6">
      <h2 className="text-white font-semibold text-sm tracking-widest uppercase mb-6">Quick Status</h2>

      <div className="flex flex-col gap-4">
        {statuses.map((s, i) => (
          <div key={i} className="flex justify-between items-center">
            <div className="flex items-center gap-3 text-[rgba(255,255,255,0.75)] text-sm font-semibold">
              <span className="text-[rgba(255,255,255,0.45)]">{s.icon}</span>
              {s.label}
            </div>
            <div className={`flex items-center gap-2 text-sm font-bold tracking-widest ${s.color}`}>
              <span className="w-2 h-2 rounded-full bg-current"></span>
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
