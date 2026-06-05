import React from 'react';
import { Zap, Sliders, ShieldCheck, DoorOpen, HardDrive } from 'lucide-react';

export const QuickStatusCard: React.FC = () => {
  const statuses = [
    { label: 'Power Status', value: 'OK', icon: <Zap size={16} />, color: 'text-green-500' },
    { label: 'Control Mode', value: 'AUTO', icon: <Sliders size={16} />, color: 'text-green-500' },
    { label: 'VFD Status', value: 'NORMAL', icon: <HardDrive size={16} />, color: 'text-green-500' },
    { label: 'Motor Protection', value: 'OK', icon: <ShieldCheck size={16} />, color: 'text-green-500' },
    { label: 'Door Status', value: 'CLOSED', icon: <DoorOpen size={16} />, color: 'text-green-500' },
  ];

  return (
    <div className="bg-[#0A2D5F] rounded-[20px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)] border border-[rgba(255,255,255,0.08)] mb-4">
      <h2 className="text-white font-bold text-sm tracking-widest uppercase mb-6">Quick Status</h2>

      <div className="flex flex-col gap-4">
        {statuses.map((s, i) => (
          <div key={i} className="flex justify-between items-center">
            <div className="flex items-center gap-3 text-gray-300 text-sm">
              <span className="text-gray-400">{s.icon}</span>
              {s.label}
            </div>
            <div className={`flex items-center gap-2 text-sm font-bold tracking-widest ${s.color}`}>
              <span className={`w-2 h-2 rounded-full bg-current shadow-[0_0_8px_currentColor]`}></span>
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
