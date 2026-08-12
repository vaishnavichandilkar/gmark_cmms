import React from 'react';

interface SystemInfoCardProps {
  systemName: string;
  location: string;
  panelId: string;
}

export const SystemInfoCard: React.FC<SystemInfoCardProps> = ({ systemName, location, panelId }) => {
  return (
    <div className="liquid-glass rounded-[24px] transition-all duration-300 hover:-translate-y-[3px] p-6">
      <h2 className="text-white font-semibold text-sm tracking-widest uppercase mb-6">System Information</h2>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <span className="text-[rgba(255,255,255,0.75)] text-sm font-semibold w-1/3">System Name</span>
          <span className="text-white text-sm font-semibold text-right w-2/3">{systemName}</span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-[rgba(255,255,255,0.75)] text-sm font-semibold w-1/3">Location</span>
          <span className="text-white text-sm font-semibold text-right w-2/3">{location}</span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-[rgba(255,255,255,0.75)] text-sm font-semibold w-1/3">Panel ID</span>
          <span className="text-white text-sm font-mono font-semibold text-right w-2/3">{panelId}</span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-[rgba(255,255,255,0.75)] text-sm font-semibold w-1/3">Software Version</span>
          <span className="text-white text-sm font-mono font-semibold text-right w-2/3">v1.2.0</span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-[rgba(255,255,255,0.75)] text-sm font-semibold w-1/3">HMI Version</span>
          <span className="text-white text-sm font-mono font-semibold text-right w-2/3">v2.1.1</span>
        </div>
      </div>
    </div>
  );
};
